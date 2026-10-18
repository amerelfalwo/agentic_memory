from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.domain.models.memory import ProceduralRule, SemanticChunk, EpisodicRecord
from backend.app.domain.models.diff import TurnMemoryDiff

class TopologyNode(BaseModel):
    id: str
    label: str
    type: str # 'agent', 'memory_working', 'memory_episodic', 'memory_semantic', 'memory_procedural', 'guardrail', 'tools'
    status: str # 'active', 'idle', 'updating'
    details: Dict[str, Any] = Field(default_factory=dict)

class TopologyEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    animated: bool = False
    active: bool = False

class MemoryTopologyResponse(BaseModel):
    nodes: List[TopologyNode]
    edges: List[TopologyEdge]
    session_id: str
    turn_id: int
    vector_db_connected: bool
    llm_connected: bool

class UpdateProceduralRequest(BaseModel):
    rules_text: str

class ProceduralResponse(BaseModel):
    rules: List[ProceduralRule]
    raw_text: str

class MemoryDiffsListResponse(BaseModel):
    session_id: str
    diffs: List[TurnMemoryDiff]

class SyncSessionContextRequest(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]] = Field(default_factory=list)

from backend.app.domain.models.memory import MemoryContext

