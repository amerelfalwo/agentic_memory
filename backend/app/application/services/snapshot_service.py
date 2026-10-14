from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from backend.app.domain.models.memory import (
    FullMemorySnapshot,
    WorkingMemorySnapshot,
    EpisodicRecord,
    SemanticChunk,
    ProceduralMemorySnapshot
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

    def execute_turn(self, session_id: str, user_input: str) -> Dict[str, Any]:
        turn_id = self._session_turns.get(session_id, 0) + 1
        self._session_turns[session_id] = turn_id

        # 1. Capture BEFORE snapshot
        before_snap = self.capture_snapshot(session_id, turn_id)

        # 2. Memory Recall Phase
        # Recall Episodic
        matched_episodic = self.vector_db.search_episodic(user_input, limit=1)
        # Recall Semantic
        semantic_chunks = self.vector_db.search_semantic(user_input, limit=4)

        # 3. Procedural Guidelines
        current_procedural = self.procedural_repo.get_snapshot().raw_text

        # 4. Construct System Prompt with multi-tier memories
        prior_convo = matched_episodic.conversation if matched_episodic else "N/A"
        what_worked = matched_episodic.what_worked if matched_episodic else "Maintain clear factual responses."
        what_to_avoid = matched_episodic.what_to_avoid if matched_episodic else "Avoid hallucinations."

        sys_content = f"""You are an advanced Agentic Memory AI Assistant built on the CoALA framework.
You recall past similar interactions from episodic memory:
- Matched Prior Case: {prior_convo}
- What Worked Well: {what_worked}
- What to Avoid: {what_to_avoid}

Procedural Guidelines:
{current_procedural}"""

        system_msg = SystemMessage(content=sys_content)
        user_msg = HumanMessage(content=user_input)

        existing_history = self.get_messages(session_id)
        current_messages = [system_msg] + [m for m in existing_history if not isinstance(m, SystemMessage)] + [user_msg]

        # 5. Security & LangGraph Execution
        state = {
            "messages": current_messages,
            "end": False,
            "session_id": session_id,
            "turn_id": turn_id
        }

        # Run through LangGraph
        graph_output = self.graph.invoke(state)
        final_messages = graph_output["messages"]
        last_response = final_messages[-1]
        response_text = last_response.content if hasattr(last_response, "content") else str(last_response)

        # Update persistent session history
        self._session_messages[session_id] = [m for m in final_messages if not isinstance(m, SystemMessage)]

        # 6. Evaluate if reflection is warranted (e.g. periodically or on explicit milestones)
        new_reflection = None
        if len(self._session_messages[session_id]) % 2 == 0 and len(self._session_messages[session_id]) >= 2:
            try:
                reflection_dict = self.llm_service.reflect_conversation(
                    format_conversation_for_summary(self._session_messages[session_id])
                )
                new_reflection = EpisodicRecord(
                    conversation=f"Turn {turn_id}: {user_input} -> {response_text[:100]}",
                    context_tags=reflection_dict.get("context_tags", ["auto_reflection"]),
                    conversation_summary=reflection_dict.get("conversation_summary", "Turn reflection"),
                    what_worked=reflection_dict.get("what_worked", "Direct adherence to prompt"),
                    what_to_avoid=reflection_dict.get("what_to_avoid", "Overcomplicating explanations")
                )
                self.vector_db.insert_episodic(new_reflection)
                
                # Check procedural evolution
                updated_rules = self.llm_service.synthesize_procedural_rules(
                    current_rules=current_procedural,
                    what_worked=new_reflection.what_worked,
                    what_to_avoid=new_reflection.what_to_avoid
                )
                if updated_rules != current_procedural:
                    self.procedural_repo.save_rules(updated_rules)
            except Exception as e:
                logger.warning(f"Turn reflection error: {e}")

        # 7. Capture AFTER snapshot
        after_snap = self.capture_snapshot(
            session_id,
            turn_id,
            active_chunks=semantic_chunks,
            matched_episodic=matched_episodic
        )

        # 8. Compute Granular Turn Diff
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

        # Save to Audit Repository
        self.audit_repo.save_snapshot(after_snap)
        self.audit_repo.save_diff(turn_diff)

        is_blocked = graph_output.get("security_blocked", False)

        return {
            "session_id": session_id,
            "turn_id": turn_id,
            "response": response_text,
            "security_blocked": is_blocked,
            "blocked_reason": graph_output.get("blocked_reason"),
            "snapshot": after_snap,
            "diff": turn_diff
        }
