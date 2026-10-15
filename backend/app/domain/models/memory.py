from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class MemoryType(str, Enum):
    WORKING = "working"
    EPISODIC = "episodic"
    SEMANTIC = "semantic"
    PROCEDURAL = "procedural"

class WorkingMemorySnapshot(BaseModel):
    message_count: int
    is_summarized: bool = False
    active_summary: Optional[str] = None
    recent_messages_preview: List[Dict[str, str]] = Field(default_factory=list)
    estimated_tokens: int = 0

class EpisodicRecord(BaseModel):
    id: Optional[str] = None
    conversation: str
    context_tags: List[str] = Field(default_factory=list)
    conversation_summary: str
    what_worked: str
    what_to_avoid: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SemanticChunk(BaseModel):
    id: Optional[str] = None
    chunk_index: int
    text: str
    source: str = "CoALA_Paper.pdf"
    score: Optional[float] = None

class ProceduralRule(BaseModel):
    index: int
    instruction: str
    rationale: Optional[str] = None

class ProceduralMemorySnapshot(BaseModel):
    rules: List[ProceduralRule] = Field(default_factory=list)
    raw_text: str = ""
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FullMemorySnapshot(BaseModel):
    snapshot_id: str
    session_id: str
    turn_id: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    working: WorkingMemorySnapshot
    episodic: Optional[EpisodicRecord] = None
    semantic: List[SemanticChunk] = Field(default_factory=list)
    procedural: ProceduralMemorySnapshot

class WorkingMemoryContext(BaseModel):
    message_count: int
    is_summarized: bool = False
    active_summary: Optional[str] = None
    estimated_tokens: int = 0
    recent_messages: List[Dict[str, Any]] = Field(default_factory=list)

class EpisodicMemoryContext(BaseModel):
    storage: str = "Weaviate Vector DB"
    matched_prior_episode: Optional[EpisodicRecord] = None
    recent_reflections: List[EpisodicRecord] = Field(default_factory=list)
    what_worked: List[str] = Field(default_factory=list)
    what_to_avoid: List[str] = Field(default_factory=list)

class SemanticMemoryContext(BaseModel):
    source: str = "CoALA_Paper.pdf"
    retrieved_chunks: List[SemanticChunk] = Field(default_factory=list)
    total_chunks_available: int = 20

class ProceduralMemoryContext(BaseModel):
    total_rules: int
    rules: List[ProceduralRule] = Field(default_factory=list)
    raw_text: str = ""
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SystemStatusContext(BaseModel):
    vector_db_connected: bool
    model_name: str
    guardrail_armed: bool = True
    session_id: str
    turn_id: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemoryContext(BaseModel):
    session_id: str
    turn_id: int
    system_status: SystemStatusContext
    working: WorkingMemoryContext
    episodic: EpisodicMemoryContext
    semantic: SemanticMemoryContext
    procedural: ProceduralMemoryContext
    formatted_prompt_context: Optional[str] = None

