import time
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from backend.app.domain.models.memory import (
    FullMemorySnapshot,
    WorkingMemorySnapshot,
    EpisodicRecord,
    SemanticChunk,
    ProceduralMemorySnapshot,
    MemoryContext,
    WorkingMemoryContext,
    EpisodicMemoryContext,
    SemanticMemoryContext,
    ProceduralMemoryContext,
    SystemStatusContext
)
from backend.app.domain.models.diff import TurnMemoryDiff
from backend.app.domain.ports.vector_db_port import IVectorDBPort
from backend.app.domain.ports.llm_port import ILLMPort
from backend.app.domain.ports.memory_port import IProceduralRepository, ISnapshotAuditRepository
from backend.app.application.services.memory_diff_service import MemoryDiffService
from backend.app.infrastructure.langgraph.nodes import NodeFactory, format_conversation_for_summary
from backend.app.infrastructure.langgraph.graph import create_memory_graph
from backend.app.core.logging import get_logger

logger = get_logger("snapshot_service")

class SnapshotCoordinatorService:
    def __init__(
        self,
        vector_db: IVectorDBPort,
        llm_service: ILLMPort,
        procedural_repo: IProceduralRepository,
        audit_repo: ISnapshotAuditRepository
    ):
        self.vector_db = vector_db
        self.llm_service = llm_service
        self.procedural_repo = procedural_repo
        self.audit_repo = audit_repo
        self.node_factory = NodeFactory(vector_db, llm_service, procedural_repo)
        self.graph = create_memory_graph(self.node_factory)

        # In-memory session message store
        self._session_messages: Dict[str, List[Any]] = {}
        self._session_turns: Dict[str, int] = {}

    def get_messages(self, session_id: str) -> List[Any]:
        if session_id not in self._session_messages:
            self._session_messages[session_id] = []
        return self._session_messages[session_id]

    def reset_session(self, session_id: str) -> None:
        self._session_messages[session_id] = []
        self._session_turns[session_id] = 0
        logger.info(f"Reset session {session_id}")

    def capture_snapshot(
        self,
        session_id: str,
        turn_id: int,
        active_chunks: Optional[List[SemanticChunk]] = None,
        matched_episodic: Optional[EpisodicRecord] = None
    ) -> FullMemorySnapshot:
        messages = self.get_messages(session_id)
        
        # Working Memory
        has_summary = any("Summary of prior conversation:" in getattr(m, "content", "") for m in messages)
        active_summary = None
        for m in messages:
            content = getattr(m, "content", "")
            if "Summary of prior conversation:" in content:
                active_summary = content
                break

        recent_preview = []
        for m in messages[-4:]:
            role = "user" if isinstance(m, HumanMessage) else ("assistant" if isinstance(m, AIMessage) else "system")
            content = getattr(m, "content", str(m))
            recent_preview.append({"role": role, "preview": content[:120]})

        total_chars = sum(len(getattr(m, "content", "")) for m in messages)
        est_tokens = total_chars // 4

        working = WorkingMemorySnapshot(
            message_count=len(messages),
            is_summarized=has_summary,
            active_summary=active_summary,
            recent_messages_preview=recent_preview,
            estimated_tokens=est_tokens
        )

        # Procedural Memory
        procedural = self.procedural_repo.get_snapshot()

        snapshot = FullMemorySnapshot(
            snapshot_id=str(uuid.uuid4()),
            session_id=session_id,
            turn_id=turn_id,
            working=working,
            episodic=matched_episodic,
            semantic=active_chunks or [],
            procedural=procedural
        )
        return snapshot

    @staticmethod
    def format_server_timing(timing_data: Dict[str, Any]) -> str:
        if not timing_data:
            return ""
        parts = []
        for stage, dur in timing_data.get("stages", {}).items():
            parts.append(f"{stage};dur={dur:.1f}")
        if "total_ms" in timing_data:
            parts.append(f"total;dur={timing_data['total_ms']:.1f}")
        return ", ".join(parts)

    def execute_turn(self, session_id: str, user_input: str) -> Dict[str, Any]:
        turn_start_time = time.perf_counter()
        timing_data: Dict[str, Any] = {
            "stages": {
                "guard": 0.0,
                "episodic_search": 0.0,
                "semantic_search": 0.0,
                "llm_summarize": 0.0,
                "llm_agent": 0.0,
                "llm_reflect": 0.0,
                "llm_procedural": 0.0,
                "snapshot_capture": 0.0,
                "diff": 0.0,
                "audit_save": 0.0,
            },
            "llm_calls": {
                "summarize": 0,
                "agent": 0,
                "reflect": 0,
                "procedural": 0,
            }
        }
        turn_id = self._session_turns.get(session_id, 0) + 1
        self._session_turns[session_id] = turn_id

        # 1. Capture BEFORE snapshot
        t0 = time.perf_counter()
        before_snap = self.capture_snapshot(session_id, turn_id)
        timing_data["stages"]["snapshot_capture"] += (time.perf_counter() - t0) * 1000

        # 2. Memory Recall Phase
        # Recall Episodic
        t0 = time.perf_counter()
        matched_episodic = self.vector_db.search_episodic(user_input, limit=1)
        timing_data["stages"]["episodic_search"] += (time.perf_counter() - t0) * 1000

        # Recall Semantic
        t0 = time.perf_counter()
        semantic_chunks = self.vector_db.search_semantic(user_input, limit=4)
        timing_data["stages"]["semantic_search"] += (time.perf_counter() - t0) * 1000

        # 3. Procedural Guidelines
        current_procedural = self.procedural_repo.get_snapshot().raw_text

        # 4. Construct System Prompt with multi-tier memories
        prior_convo = matched_episodic.conversation if matched_episodic else "N/A"
        what_worked = matched_episodic.what_worked if matched_episodic else "Maintain clear factual responses."
        what_to_avoid = matched_episodic.what_to_avoid if matched_episodic else "Avoid hallucinations."

        semantic_text_parts = []
        if semantic_chunks:
            for idx, sc in enumerate(semantic_chunks):
                txt = getattr(sc, "text", str(sc))
                score = getattr(sc, "score", None)
                score_str = f" (relevance: {score:.2f})" if score is not None else ""
                semantic_text_parts.append(f"- Chunk {idx + 1}{score_str}: {txt}")
        semantic_summary = "\n".join(semantic_text_parts) if semantic_text_parts else "No direct semantic chunks retrieved."

        sys_content = f"""You are Mnemos, an advanced Cognitive Memory AI Agent built on the CoALA framework.

[Episodic Memory (Past Learnings & Experiences)]
- Matched Prior Case: {prior_convo}
- What Worked Well: {what_worked}
- What to Avoid: {what_to_avoid}

[Procedural Memory Guidelines]
{current_procedural}

[Semantic Memory Grounding (CoALA Knowledge Base)]
{semantic_summary}
"""

        system_msg = SystemMessage(content=sys_content)
        user_msg = HumanMessage(content=user_input)

        existing_history = self.get_messages(session_id)
        current_messages = [system_msg] + [m for m in existing_history if not isinstance(m, SystemMessage)] + [user_msg]

        # 5. Security & LangGraph Execution
        state = {
            "messages": current_messages,
            "semantic_memory": semantic_summary,
            "procedural_memory": current_procedural,
            "prior_conversations": [prior_convo] if prior_convo != "N/A" else [],
            "what_worked": [what_worked],
            "what_to_avoid": [what_to_avoid],
            "end": False,
            "session_id": session_id,
            "turn_id": turn_id,
            "retrieved_chunks": [
                c.model_dump() if hasattr(c, "model_dump") else (c.dict() if hasattr(c, "dict") else {"text": getattr(c, "text", str(c))})
                for c in semantic_chunks
            ] if semantic_chunks else [],
            "timing_data": timing_data
        }

        # Run through LangGraph
        graph_output = self.graph.invoke(state)
        if "timing_data" in graph_output and graph_output["timing_data"]:
            gt = graph_output["timing_data"]
            for k, v in gt.get("stages", {}).items():
                timing_data["stages"][k] = v
            for k, v in gt.get("llm_calls", {}).items():
                timing_data["llm_calls"][k] = v

        final_messages = graph_output["messages"]
        last_response = final_messages[-1]
        response_text = last_response.content if hasattr(last_response, "content") else str(last_response)

        # Guard: if last message content is empty (e.g. tool call message), scan backwards for text
        if not response_text or not str(response_text).strip():
            for m in reversed(final_messages):
                c = getattr(m, "content", "")
                if c and isinstance(c, str) and c.strip():
                    response_text = c
                    break
        if not response_text or not str(response_text).strip():
            try:
                direct = self.llm_service.invoke(final_messages)
                response_text = direct.content if hasattr(direct, "content") else str(direct)
            except Exception:
                response_text = "I have processed your query and synchronized the active memory state."

        # Update persistent session history
        self._session_messages[session_id] = [m for m in final_messages if not isinstance(m, SystemMessage)]

        # 6. Evaluate if reflection is warranted (e.g. periodically or on explicit milestones)
        new_reflection = None
        if len(self._session_messages[session_id]) % 2 == 0 and len(self._session_messages[session_id]) >= 2:
            try:
                t0 = time.perf_counter()
                reflection_dict = self.llm_service.reflect_conversation(
                    format_conversation_for_summary(self._session_messages[session_id])
                )
                timing_data["stages"]["llm_reflect"] += (time.perf_counter() - t0) * 1000
                timing_data["llm_calls"]["reflect"] += 1

                new_reflection = EpisodicRecord(
                    conversation=f"Turn {turn_id}: {user_input} -> {response_text[:100]}",
                    context_tags=reflection_dict.get("context_tags", ["auto_reflection"]),
                    conversation_summary=reflection_dict.get("conversation_summary", "Turn reflection"),
                    what_worked=reflection_dict.get("what_worked", "Direct adherence to prompt"),
                    what_to_avoid=reflection_dict.get("what_to_avoid", "Overcomplicating explanations")
                )
                self.vector_db.insert_episodic(new_reflection)
                
                # Check procedural evolution
                t0 = time.perf_counter()
                updated_rules = self.llm_service.synthesize_procedural_rules(
                    current_rules=current_procedural,
                    what_worked=new_reflection.what_worked,
                    what_to_avoid=new_reflection.what_to_avoid
                )
                timing_data["stages"]["llm_procedural"] += (time.perf_counter() - t0) * 1000
                timing_data["llm_calls"]["procedural"] += 1

                if updated_rules != current_procedural:
                    self.procedural_repo.save_rules(updated_rules)
            except Exception as e:
                logger.warning(f"Turn reflection error: {e}")

        # 7. Capture AFTER snapshot
        t0 = time.perf_counter()
        after_snap = self.capture_snapshot(
            session_id,
            turn_id,
            active_chunks=semantic_chunks,
            matched_episodic=matched_episodic
        )
        timing_data["stages"]["snapshot_capture"] += (time.perf_counter() - t0) * 1000

        # 8. Compute Granular Turn Diff
        t0 = time.perf_counter()
        added_msgs = [
            {"role": "user", "content": user_input},
            {"role": "assistant", "content": response_text}
        ]
        turn_diff = MemoryDiffService.compute_turn_diff(
            session_id=session_id,
            turn_id=turn_id,
            before_snap=before_snap,
            after_snap=after_snap,
            query=user_input,
            retrieved_semantic=semantic_chunks,
            matched_episodic=matched_episodic,
            new_reflection=new_reflection,
            added_messages=added_msgs
        )
        timing_data["stages"]["diff"] += (time.perf_counter() - t0) * 1000

        # Save to Audit Repository
        t0 = time.perf_counter()
        self.audit_repo.save_snapshot(after_snap)
        self.audit_repo.save_diff(turn_diff)
        timing_data["stages"]["audit_save"] += (time.perf_counter() - t0) * 1000

        total_turn_ms = (time.perf_counter() - turn_start_time) * 1000
        timing_data["total_ms"] = total_turn_ms
        timing_data["llm_calls"]["total"] = sum(timing_data["llm_calls"].values())

        # One structured log line per turn
        logger.info(
            json.dumps({
                "event": "turn_timing",
                "session_id": session_id,
                "turn_id": turn_id,
                "total_ms": round(total_turn_ms, 2),
                "stages_ms": {k: round(v, 2) for k, v in timing_data["stages"].items()},
                "llm_calls": timing_data["llm_calls"]
            })
        )

        is_blocked = graph_output.get("security_blocked", False)

        return {
            "session_id": session_id,
            "turn_id": turn_id,
            "response": response_text,
            "security_blocked": is_blocked,
            "blocked_reason": graph_output.get("blocked_reason"),
            "snapshot": after_snap,
            "diff": turn_diff,
            "timing": timing_data
        }

    def get_memory_context(self, session_id: str, query: Optional[str] = None) -> MemoryContext:
        turn_id = self._session_turns.get(session_id, 0)
        messages = self.get_messages(session_id)
        vdb_connected = self.vector_db.is_connected()
        model_name = getattr(self.llm_service, "_model_name", "ChatGroq (Qwen)")

        # 1. Working Memory Context
        has_summary = any("Summary of prior conversation:" in getattr(m, "content", "") for m in messages)
        active_summary = None
        for m in messages:
            content = getattr(m, "content", "")
            if "Summary of prior conversation:" in content:
                active_summary = content
                break

        recent_msgs = []
        for m in messages:
            role = "user" if isinstance(m, HumanMessage) else ("assistant" if isinstance(m, AIMessage) else "system")
            content = getattr(m, "content", str(m))
            recent_msgs.append({"role": role, "content": content})

        est_tokens = sum(len(getattr(m, "content", "")) for m in messages) // 4
        working_ctx = WorkingMemoryContext(
            message_count=len(messages),
            is_summarized=has_summary,
            active_summary=active_summary,
            estimated_tokens=est_tokens,
            recent_messages=recent_msgs[-10:]
        )

        # 2. Episodic Memory Context
        search_query = query
        if not search_query and recent_msgs:
            for m in reversed(recent_msgs):
                if m["role"] == "user":
                    search_query = m["content"]
                    break

        matched_episode = None
        if search_query:
            matched_episode = self.vector_db.search_episodic(search_query)

        session_diffs = self.audit_repo.get_diffs(session_id)
        what_worked_list = []
        what_to_avoid_list = []
        recent_reflections = []

        if matched_episode:
            recent_reflections.append(matched_episode)
            what_worked_list.append(matched_episode.what_worked)
            what_to_avoid_list.append(matched_episode.what_to_avoid)

        for d in session_diffs:
            if d.episodic_diff and d.episodic_diff.new_reflection:
                nr = d.episodic_diff.new_reflection
                if nr not in recent_reflections:
                    recent_reflections.append(nr)
                if nr.what_worked and nr.what_worked not in what_worked_list:
                    what_worked_list.append(nr.what_worked)
                if nr.what_to_avoid and nr.what_to_avoid not in what_to_avoid_list:
                    what_to_avoid_list.append(nr.what_to_avoid)

        episodic_ctx = EpisodicMemoryContext(
            storage="Weaviate Vector DB" if vdb_connected else "In-Memory Vector Store",
            matched_prior_episode=matched_episode,
            recent_reflections=recent_reflections[:5],
            what_worked=what_worked_list[:5],
            what_to_avoid=what_to_avoid_list[:5]
        )

        # 3. Semantic Memory Context
        semantic_chunks = []
        if search_query:
            semantic_chunks = self.vector_db.search_semantic(search_query, limit=4)

        semantic_ctx = SemanticMemoryContext(
            source="CoALA_Paper.pdf",
            retrieved_chunks=semantic_chunks,
            total_chunks_available=20
        )

        # 4. Procedural Memory Context
        proc_snap = self.procedural_repo.get_snapshot()
        procedural_ctx = ProceduralMemoryContext(
            total_rules=len(proc_snap.rules),
            rules=proc_snap.rules,
            raw_text=proc_snap.raw_text,
            last_updated=proc_snap.last_updated
        )

        # 5. System Status Context
        status_ctx = SystemStatusContext(
            vector_db_connected=vdb_connected,
            model_name=model_name,
            guardrail_armed=True,
            session_id=session_id,
            turn_id=turn_id,
            timestamp=datetime.now(timezone.utc)
        )

        # 6. Formatted CoALA Prompt Context
        formatted_prompt = f"""[CoALA Architecture Active Memory Context]
Session ID: {session_id} (Turn #{turn_id})
Working Memory: {len(messages)} messages, active summary={bool(active_summary)}
Episodic Memory Recall: {matched_episode.conversation_summary if matched_episode else 'None'}
Semantic Grounding: {len(semantic_chunks)} chunks retrieved from CoALA Paper
Procedural Guidelines: {len(proc_snap.rules)} behavioral rules enforced"""

        return MemoryContext(
            session_id=session_id,
            turn_id=turn_id,
            system_status=status_ctx,
            working=working_ctx,
            episodic=episodic_ctx,
            semantic=semantic_ctx,
            procedural=procedural_ctx,
            formatted_prompt_context=formatted_prompt
        )

    def sync_session_messages(self, session_id: str, raw_messages: List[Dict[str, Any]]) -> int:
        converted = []
        for m in raw_messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "user":
                converted.append(HumanMessage(content=content))
            elif role == "assistant":
                converted.append(AIMessage(content=content))
            else:
                converted.append(SystemMessage(content=content))
        self._session_messages[session_id] = converted
        self._session_turns[session_id] = len([m for m in converted if isinstance(m, HumanMessage)])
        logger.info(f"Synchronized {len(converted)} messages for session {session_id}")
        return len(converted)

