# Baseline Performance Report

**Environment & Setup:**
- Date: 2026-10-15 04:54:20 UTC
- Total Turns Evaluated: 10 scripted turns (sequential multi-turn conversation)
- Session ID: `session-perf-baseline`
- Model: `qwen/qwen3.8-27b` (ChatGroq)
- Vector DB: Weaviate Cloud (with in-memory fallback adapter)
- Script: `scripts/perf_session.py`

## 1. Summary Metrics (p50 / p95)

| Metric / Stage | p50 (Median) | p95 (95th Percentile) | Unit |
|---|---|---|---|
| **Time to First Token (TTFT)** | **1917.6** | **13883.0** | ms |
| **Total Turn Time** | **2964.7** | **14952.1** | ms |
| **LLM Calls Per Turn** | **5.8 (avg)** | **6 (max)** | calls |
| Stage: `guard` | 0.0 | 0.0 | ms |
| Stage: `episodic_search` | 242.2 | 685.0 | ms |
| Stage: `semantic_search` | 69.6 | 251.2 | ms |
| Stage: `llm_summarize` | 87.9 | 304.8 | ms |
| Stage: `llm_agent` | 366.1 | 711.7 | ms |
| Stage: `llm_reflect` | 237.0 | 11143.6 | ms |
| Stage: `llm_procedural` | 189.4 | 306.5 | ms |
| Stage: `snapshot_capture` | 2.3 | 4.5 | ms |
| Stage: `diff` | 0.2 | 0.3 | ms |
| Stage: `audit_save` | 0.1 | 0.2 | ms |

## 2. Turn-by-Turn Breakdown

| Turn | Prompt | TTFT (ms) | Total (ms) | LLM Calls (Sum/Agent/Refl/Proc) | Total LLM Calls |
|---|---|---|---|---|---|
| 1 | Hello! Who are you and what do you do? | 22033.2 | 23105.9 | 0/1/2/2 | 5 |
| 2 | Can you explain the CoALA framework in simple terms? | 3921.7 | 4986.2 | 0/1/2/2 | 5 |
| 3 | What are the four memory subsystems defined in CoALA? | 2961.8 | 4009.0 | 1/1/2/2 | 6 |
| 4 | How does Working Memory differ from Episodic Memory? | 2419.6 | 3462.5 | 1/1/2/2 | 6 |
| 5 | What role does Semantic Memory play in grounding knowledge? | 2023.2 | 3067.7 | 1/1/2/2 | 6 |
| 6 | How does Procedural Memory evolve through interaction? | 1627.6 | 2687.5 | 1/1/2/2 | 6 |
| 7 | Give an example of an action cycle: Planning -> Execution -> Evaluation. | 1811.9 | 2861.7 | 1/1/2/2 | 6 |
| 8 | Summarize our conversation so far in 3 bullet points. | 1668.2 | 2729.8 | 1/1/2/2 | 6 |
| 9 | Thanks! How can external tools or MCP be integrated? | 1671.4 | 2716.3 | 1/1/2/2 | 6 |
| 10 | Thank you for the detailed explanations, goodbye! | 1663.1 | 2710.1 | 1/1/2/2 | 6 |

## 3. Analysis of Baseline Bottlenecks Identified

1. **Faked Streaming & Late TTFT:**
   - In `/chat/stream`, TTFT is 1917.6 ms because the entire turn (including searches, agent invocation, and synchronous reflections) is executed *before* streaming synthetic word tokens with `asyncio.sleep(0.02)`.
2. **Duplicate & Blocking Reflection In Request Path:**
   - On multiple turns, reflection (`llm_reflect`) and procedural rewrite (`llm_procedural`) run synchronously in the request path (in both the LangGraph `update_memory` node and in `SnapshotCoordinatorService.execute_turn` step 6).
   - This causes turns to execute multiple sequential LLM calls (up to 6 LLM calls in a single turn).
3. **Sequential Vector Retrieval & Collection Checking:**
   - `episodic_search` and `semantic_search` run sequentially and each issue `collections.exists()` HTTP roundtrips over Weaviate Cloud.
4. **History Summarization Escalation:**
   - Once conversation history exceeds threshold, summarization fires synchronously before agent execution, increasing turn latency and LLM call counts.
