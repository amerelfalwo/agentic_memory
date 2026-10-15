#!/usr/bin/env python3
import sys
import os
import json
import time
import argparse
import numpy as np
import httpx

DEFAULT_BASE_URL = "http://localhost:8000"
PROMPTS = [
    "Hello! Who are you and what do you do?",
    "Can you explain the CoALA framework in simple terms?",
    "What are the four memory subsystems defined in CoALA?",
    "How does Working Memory differ from Episodic Memory?",
    "What role does Semantic Memory play in grounding knowledge?",
    "How does Procedural Memory evolve through interaction?",
    "Give an example of an action cycle: Planning -> Execution -> Evaluation.",
    "Summarize our conversation so far in 3 bullet points.",
    "Thanks! How can external tools or MCP be integrated?",
    "Thank you for the detailed explanations, goodbye!"
]

STAGES = [
    "guard",
    "episodic_search",
    "semantic_search",
    "llm_summarize",
    "llm_agent",
    "llm_reflect",
    "llm_procedural",
    "snapshot_capture",
    "diff",
    "audit_save"
]

def parse_sse_stream(response):
    current_event = None
    for line in response.iter_lines():
        if not line:
            continue
        if line.startswith("event:"):
            current_event = line.split("event:", 1)[1].strip()
        elif line.startswith("data:"):
            data_str = line.split("data:", 1)[1].strip()
            yield current_event, data_str

def run_turn_stream(client, base_url, session_id, prompt):
    t_start = time.perf_counter()
    ttft_ms = None
    first_token_time = None
    done_payload = None
    token_count = 0

    url = f"{base_url}/api/v1/chat/stream"
    payload = {"session_id": session_id, "message": prompt}

    with client.stream("POST", url, json=payload, timeout=120.0) as response:
        response.raise_for_status()
        for event, data_str in parse_sse_stream(response):
            if event == "token":
                token_count += 1
                if ttft_ms is None:
                    ttft_ms = (time.perf_counter() - t_start) * 1000
            elif event == "done":
                try:
                    done_payload = json.loads(data_str)
                except Exception as e:
                    print(f"Error parsing done payload: {e}")

    total_turn_ms = (time.perf_counter() - t_start) * 1000
    if ttft_ms is None:
        ttft_ms = total_turn_ms

    return {
        "ttft_ms": ttft_ms,
        "total_turn_ms": total_turn_ms,
        "tokens_streamed": token_count,
        "done": done_payload or {}
    }

def verify_server_timing_header(client, base_url):
    print("Verifying Server-Timing header on /api/v1/chat...")
    res = client.post(f"{base_url}/api/v1/chat", json={"session_id": "test-header-check", "message": "Ping check for header"}, timeout=60.0)
    server_timing = res.headers.get("server-timing") or res.headers.get("Server-Timing")
    print(f"Server-Timing Header: {server_timing}")
    assert server_timing is not None, "Server-Timing header was missing from /api/v1/chat!"
    return server_timing

def run_session(base_url=DEFAULT_BASE_URL, session_id="session-perf-baseline", output_file=None, label="baseline"):
    client = httpx.Client()
    
    # Check Server-Timing header
    verify_server_timing_header(client, base_url)

    # Reset session
    client.post(f"{base_url}/api/v1/chat/reset", json={"session_id": session_id}, timeout=30.0)
    print(f"\nStarting 10-turn performance benchmark session: '{session_id}' against {base_url}\n" + "="*80)

    turn_results = []

    for i, prompt in enumerate(PROMPTS, 1):
        print(f"\n[Turn {i}/10] Prompt: '{prompt}'")
        res = run_turn_stream(client, base_url, session_id, prompt)

        timing_info = res["done"].get("timing", {})
        stages_info = timing_info.get("stages", {})
        llm_calls_info = timing_info.get("llm_calls", {})

        turn_data = {
            "turn": i,
            "prompt": prompt,
            "ttft_ms": res["ttft_ms"],
            "total_turn_ms": res["total_turn_ms"],
            "stages": {s: stages_info.get(s, 0.0) for s in STAGES},
            "llm_calls": {
                "summarize": llm_calls_info.get("summarize", 0),
                "agent": llm_calls_info.get("agent", 0),
                "reflect": llm_calls_info.get("reflect", 0),
                "procedural": llm_calls_info.get("procedural", 0),
                "total": llm_calls_info.get("total", sum(llm_calls_info.values()) if llm_calls_info else 0)
            }
        }
        turn_results.append(turn_data)

        print(f" -> TTFT: {res['ttft_ms']:.1f} ms | Total Turn: {res['total_turn_ms']:.1f} ms | LLM Calls: {turn_data['llm_calls']['total']}")
        print(f"    Stages: guard={turn_data['stages']['guard']:.1f}ms, episodic={turn_data['stages']['episodic_search']:.1f}ms, semantic={turn_data['stages']['semantic_search']:.1f}ms, agent={turn_data['stages']['llm_agent']:.1f}ms, reflect={turn_data['stages']['llm_reflect']:.1f}ms, procedural={turn_data['stages']['llm_procedural']:.1f}ms, snap={turn_data['stages']['snapshot_capture']:.1f}ms, diff={turn_data['stages']['diff']:.1f}ms, audit={turn_data['stages']['audit_save']:.1f}ms")

    # Aggregate p50 / p95
    p50_stages = {}
    p95_stages = {}
    for s in STAGES:
        vals = [t["stages"][s] for t in turn_results]
        p50_stages[s] = float(np.percentile(vals, 50))
        p95_stages[s] = float(np.percentile(vals, 95))

    ttft_vals = [t["ttft_ms"] for t in turn_results]
    total_vals = [t["total_turn_ms"] for t in turn_results]
    llm_calls_vals = [t["llm_calls"]["total"] for t in turn_results]

    p50_ttft = float(np.percentile(ttft_vals, 50))
    p95_ttft = float(np.percentile(ttft_vals, 95))

    p50_total = float(np.percentile(total_vals, 50))
    p95_total = float(np.percentile(total_vals, 95))

    avg_llm_calls = float(np.mean(llm_calls_vals))
    max_llm_calls = int(np.max(llm_calls_vals))

    print("\n" + "="*80)
    print(f"BENCHMARK RESULTS SUMMARY ({label.upper()} - 10 TURNS)")
    print("="*80)
    print(f"Time to First Token (TTFT): p50={p50_ttft:.1f}ms | p95={p95_ttft:.1f}ms")
    print(f"Total Turn Time:           p50={p50_total:.1f}ms | p95={p95_total:.1f}ms")
    print(f"LLM Calls Per Turn:        avg={avg_llm_calls:.1f} | max={max_llm_calls}")
    print("-" * 80)
    for s in STAGES:
        print(f" Stage {s:<20}: p50={p50_stages[s]:8.1f}ms | p95={p95_stages[s]:8.1f}ms")
    print("="*80)

    # Format Markdown Report
    title = "Baseline Performance Report" if label == "baseline" else "Post-Optimization Performance Report"
    md_content = f"""# {title}

**Environment & Setup:**
- Date: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}
- Total Turns Evaluated: 10 scripted turns (sequential multi-turn conversation)
- Session ID: `{session_id}`
- Model: `qwen/qwen3.8-27b` (ChatGroq)
- Vector DB: Weaviate Cloud (with in-memory fallback adapter)
- Script: `scripts/perf_session.py`

## 1. Summary Metrics (p50 / p95)

| Metric / Stage | p50 (Median) | p95 (95th Percentile) | Unit |
|---|---|---|---|
| **Time to First Token (TTFT)** | **{p50_ttft:.1f}** | **{p95_ttft:.1f}** | ms |
| **Total Turn Time** | **{p50_total:.1f}** | **{p95_total:.1f}** | ms |
| **LLM Calls Per Turn** | **{avg_llm_calls:.1f} (avg)** | **{max_llm_calls} (max)** | calls |
| Stage: `guard` | {p50_stages['guard']:.1f} | {p95_stages['guard']:.1f} | ms |
| Stage: `episodic_search` | {p50_stages['episodic_search']:.1f} | {p95_stages['episodic_search']:.1f} | ms |
| Stage: `semantic_search` | {p50_stages['semantic_search']:.1f} | {p95_stages['semantic_search']:.1f} | ms |
| Stage: `llm_summarize` | {p50_stages['llm_summarize']:.1f} | {p95_stages['llm_summarize']:.1f} | ms |
| Stage: `llm_agent` | {p50_stages['llm_agent']:.1f} | {p95_stages['llm_agent']:.1f} | ms |
| Stage: `llm_reflect` | {p50_stages['llm_reflect']:.1f} | {p95_stages['llm_reflect']:.1f} | ms |
| Stage: `llm_procedural` | {p50_stages['llm_procedural']:.1f} | {p95_stages['llm_procedural']:.1f} | ms |
| Stage: `snapshot_capture` | {p50_stages['snapshot_capture']:.1f} | {p95_stages['snapshot_capture']:.1f} | ms |
| Stage: `diff` | {p50_stages['diff']:.1f} | {p95_stages['diff']:.1f} | ms |
| Stage: `audit_save` | {p50_stages['audit_save']:.1f} | {p95_stages['audit_save']:.1f} | ms |

## 2. Turn-by-Turn Breakdown

| Turn | Prompt | TTFT (ms) | Total (ms) | LLM Calls (Sum/Agent/Refl/Proc) | Total LLM Calls |
|---|---|---|---|---|---|
"""
    for t in turn_results:
        calls = t["llm_calls"]
        calls_str = f"{calls['summarize']}/{calls['agent']}/{calls['reflect']}/{calls['procedural']}"
        clean_prompt = t["prompt"].replace("|", "\\|")
        md_content += f"| {t['turn']} | {clean_prompt} | {t['ttft_ms']:.1f} | {t['total_turn_ms']:.1f} | {calls_str} | {calls['total']} |\n"

    md_content += f"""
## 3. Analysis of Baseline Bottlenecks Identified

1. **Faked Streaming & Late TTFT:**
   - In `/chat/stream`, TTFT is {p50_ttft:.1f} ms because the entire turn (including searches, agent invocation, and synchronous reflections) is executed *before* streaming synthetic word tokens with `asyncio.sleep(0.02)`.
2. **Duplicate & Blocking Reflection In Request Path:**
   - On multiple turns, reflection (`llm_reflect`) and procedural rewrite (`llm_procedural`) run synchronously in the request path (in both the LangGraph `update_memory` node and in `SnapshotCoordinatorService.execute_turn` step 6).
   - This causes turns to execute multiple sequential LLM calls (up to {max_llm_calls} LLM calls in a single turn).
3. **Sequential Vector Retrieval & Collection Checking:**
   - `episodic_search` and `semantic_search` run sequentially and each issue `collections.exists()` HTTP roundtrips over Weaviate Cloud.
4. **History Summarization Escalation:**
   - Once conversation history exceeds threshold, summarization fires synchronously before agent execution, increasing turn latency and LLM call counts.
"""

    if output_file:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w") as f:
            f.write(md_content)
        print(f"\nSaved report to: {output_file}")

    return {
        "p50_ttft": p50_ttft,
        "p95_ttft": p95_ttft,
        "p50_total": p50_total,
        "p95_total": p95_total,
        "avg_llm_calls": avg_llm_calls,
        "max_llm_calls": max_llm_calls,
        "p50_stages": p50_stages,
        "p95_stages": p95_stages,
        "turns": turn_results
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mnemos Chat Latency Benchmark")
    parser.add_argument("--url", default=DEFAULT_BASE_URL, help="Base API URL")
    parser.add_argument("--session", default="session-perf-baseline", help="Session ID")
    parser.add_argument("--output", default="docs/perf/baseline.md", help="Output Markdown path")
    parser.add_argument("--label", default="baseline", help="Label (baseline or after)")
    args = parser.parse_args()

    run_session(base_url=args.url, session_id=args.session, output_file=args.output, label=args.label)
