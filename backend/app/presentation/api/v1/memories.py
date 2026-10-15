from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from backend.app.application.dtos.memory_dtos import (
    MemoryTopologyResponse,
    TopologyNode,
    TopologyEdge,
    MemoryDiffsListResponse
)
from backend.app.domain.models.diff import TurnMemoryDiff
from backend.app.domain.models.memory import SemanticChunk, EpisodicRecord
from backend.app.application.services.snapshot_service import SnapshotCoordinatorService
from backend.app.presentation.dependencies import get_coordinator_service
from backend.app.core.logging import get_logger

logger = get_logger("memories_router")
router = APIRouter()

@router.get("/memories/topology", response_model=MemoryTopologyResponse, summary="Get active agent-memory connection graph topology")
def get_memory_topology(
    session_id: str = "default-session",
    coordinator: SnapshotCoordinatorService = Depends(get_coordinator_service)
):
    turn_id = coordinator._session_turns.get(session_id, 0)
    messages = coordinator.get_messages(session_id)
    proc_snapshot = coordinator.procedural_repo.get_snapshot()
    vdb_connected = coordinator.vector_db.is_connected()
    llm_connected = coordinator.llm_service.is_live()

    nodes: List[TopologyNode] = [
        TopologyNode(
            id="agent-core",
            label="Mnemos Core Agent (LLM)",
            type="agent",
            status="active" if llm_connected else "simulated",
            details={
                "model": coordinator.llm_service._model_name,
                "current_turn": turn_id,
                "active_messages": len(messages)
            }
        ),
        TopologyNode(
            id="working-memory",
            label="⚡ Working Memory",
            type="memory_working",
            status="active" if messages else "idle",
            details={
                "message_count": len(messages),
                "is_summarized": any("Summary of prior conversation:" in getattr(m, "content", "") for m in messages),
                "tokens": sum(len(getattr(m, "content", "")) for m in messages) // 4
            }
        ),
        TopologyNode(
            id="episodic-memory",
            label="📖 Episodic Memory",
            type="memory_episodic",
            status="active",
            details={
                "storage": "Weaviate Vector DB" if vdb_connected else "In-Memory Vector Store",
                "collection": "episodic_memory",
                "recall_mode": "Hybrid (Vector + BM25)"
            }
        ),
        TopologyNode(
            id="semantic-memory",
            label="📚 Semantic Memory",
            type="memory_semantic",
            status="active",
            details={
                "source": "CoALA_Paper.pdf",
                "collection": "CoALA_Paper",
                "hybrid_alpha": 0.5
            }
        ),
        TopologyNode(
            id="procedural-memory",
            label="📋 Procedural Memory",
            type="memory_procedural",
            status="active",
            details={
                "total_guidelines": len(proc_snapshot.rules),
                "last_updated": proc_snapshot.last_updated.isoformat()
            }
        ),
        TopologyNode(
            id="guardrail-node",
            label="🛡️ Security Guardrail",
            type="guardrail",
            status="active",
            details={
                "protection": "Prompt Injection & System Prompt Protection",
                "state": "Armed"
            }
        ),
        TopologyNode(
            id="tools-node",
            label="🔧 MCP / External Tools",
            type="tools",
            status="active",
            details={
                "registered_tools": ["search_knowledge_base"]
            }
        )
    ]

    edges: List[TopologyEdge] = [
        TopologyEdge(
            id="e-guard-agent",
            source="guardrail-node",
            target="agent-core",
            label="Input Interception & Validation",
            animated=True,
            active=True
        ),
        TopologyEdge(
            id="e-agent-working",
            source="agent-core",
            target="working-memory",
            label="Read Buffer / Append Dialogue",
            animated=True,
            active=len(messages) > 0
        ),
        TopologyEdge(
            id="e-agent-episodic",
            source="agent-core",
            target="episodic-memory",
            label="Recall Reflections / Store Learnings",
            animated=True,
            active=turn_id > 0
        ),
        TopologyEdge(
            id="e-agent-semantic",
            source="agent-core",
            target="semantic-memory",
            label="Hybrid Vector Retrieval",
            animated=True,
            active=turn_id > 0
        ),
        TopologyEdge(
            id="e-agent-procedural",
            source="agent-core",
            target="procedural-memory",
            label="Read Guidelines / Synthesize Evolution",
            animated=True,
            active=True
        ),
        TopologyEdge(
            id="e-agent-tools",
            source="agent-core",
            target="tools-node",
            label="Tool Call Dispatch",
            animated=False,
            active=False
        )
    ]

    return MemoryTopologyResponse(
        nodes=nodes,
        edges=edges,
        session_id=session_id,
        turn_id=turn_id,
        vector_db_connected=vdb_connected,
        llm_connected=llm_connected
    )

@router.get("/memories/diffs/{session_id}", response_model=MemoryDiffsListResponse, summary="List all turn memory diffs for a session")
def get_session_diffs(
    session_id: str,
    coordinator: SnapshotCoordinatorService = Depends(get_coordinator_service)
):
    diffs = coordinator.audit_repo.get_diffs(session_id)
    return MemoryDiffsListResponse(session_id=session_id, diffs=diffs)

@router.get("/memories/diff/{session_id}/{turn_id}", response_model=TurnMemoryDiff, summary="Get memory diff for a specific turn")
def get_turn_diff(
    session_id: str,
    turn_id: int,
    coordinator: SnapshotCoordinatorService = Depends(get_coordinator_service)
):
    diff = coordinator.audit_repo.get_diff(session_id, turn_id)
    if not diff:
        raise HTTPException(status_code=404, detail=f"Memory diff for turn {turn_id} in session {session_id} not found.")
    return diff

@router.get("/memories/semantic", response_model=List[SemanticChunk], summary="Search semantic knowledge chunks directly")
def search_semantic(
    query: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=20),
    coordinator: SnapshotCoordinatorService = Depends(get_coordinator_service)
):
    return coordinator.vector_db.search_semantic(query, limit)

@router.get("/memories/episodic", response_model=Optional[EpisodicRecord], summary="Search episodic memory reflections directly")
def search_episodic(
    query: str = Query(..., min_length=1),
    coordinator: SnapshotCoordinatorService = Depends(get_coordinator_service)
):
    return coordinator.vector_db.search_episodic(query)
