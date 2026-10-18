# ADR 001: Asynchronous Background Memory Reflection and Consolidation

## Status
Accepted

## Context
In the original implementation of Mnemos, conversation reflection (`reflect_conversation`) and procedural guideline rewriting (`synthesize_procedural_rules`) were invoked synchronously within the HTTP request execution path. Specifically:
1. LangGraph executed an `update_memory` node after every response when history contained at least two messages.
2. `SnapshotCoordinatorService.execute_turn` separately invoked a duplicate reflection and procedural update step (Step 6) on every even turn.

In a 10-turn scripted benchmark session (`docs/perf/baseline.md`), this resulted in:
- Up to 6 LLM calls executed sequentially within a single user turn (avg 5.8 LLM calls per turn).
- Reflection and procedural synthesis alone consumed between 400ms and 11,000ms+ per turn, directly blocking the user response.
- Groq token rate limit exhaustion (TPD/TPM limits on free/on-demand tiers) caused exponential backoffs and massive latency degradation.
- Artificial response streaming (`asyncio.sleep` per word after the turn was complete) masked the blocking nature of the pipeline.

From a cognitive architecture standpoint (aligned with the CoALA framework), memory consolidation (reflection and procedural rule evolution) is an offline or post-action cognitive process rather than a synchronous blocker for immediate communicative action.

## Decision
1. **Remove Reflection from the Request Path**:
   - Disconnect synchronous reflection from both the LangGraph request graph and `SnapshotCoordinatorService.execute_turn`.
   - The user turn will only execute security guardrails, vector memory retrieval, and agent generation before returning or streaming the response immediately.

2. **Run Memory Consolidation Asynchronously Post-Response**:
   - Trigger reflection and procedural updating in an asynchronous background worker (`asyncio.create_task` or FastAPI background tasks) immediately following the completion of the response stream or at session milestones.
   - Enforce a single canonical implementation path for reflection (`MemoryConsolidationService` / background task) eliminating duplicate runs.

3. **Concurrency Control & Idempotency**:
   - Guard background consolidation with a per-session `asyncio.Lock` / synchronization primitive to guarantee that overlapping requests from the same session do not trigger concurrent, conflicting reflection passes.
   - Ensure reflection is idempotent by tracking the last reflected `turn_id`.

4. **Targeted Model Settings for Consolidation**:
   - Allocate a lightweight, high-throughput model (e.g. `openai/gpt-oss-20b`) with deterministic settings (`temperature=0.0`), explicit `max_tokens` (capped at 300), strict timeout (15s), and `max_retries=1` to ensure reflection completes swiftly without impacting the primary conversational model's token quota.

## Consequences

### Positive
- **Drastic Latency Reduction**: Eliminates 2–4 blocking LLM calls per turn from the user response path, reducing turn latency from multiple seconds down to sub-second or immediate streaming.
- **Lower TTFT**: Time-to-first-token is decoupled from background reflection and reflects only guardrail check + retrieval + LLM generation start.
- **Rate Limit Resilience**: Prevents cascading 429 rate limit exceptions caused by burst LLM invocations on each turn.
- **Single Source of Truth**: Removes divergent logic between LangGraph `update_memory` and `snapshot_service.py:198`.

### Trade-offs & Mitigations
- *Eventual Consistency*: Memory updates from turn $N$ may not be persisted in Weaviate until a fraction of a second after turn $N$'s response completes. Given standard human conversational cadence (typing speed > 1-2 seconds), the background task will reliably complete before the user submits turn $N+1$.
