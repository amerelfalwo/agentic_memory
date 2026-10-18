from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from backend.app.domain.models.memory import EpisodicRecord, SemanticChunk, ProceduralRule

class DiffAction(str, Enum):
    ADDED = "added"
    MODIFIED = "modified"
    REMOVED = "removed"
    UNCHANGED = "unchanged"

class RuleDiffItem(BaseModel):
    index: int
    action: DiffAction
    old_instruction: Optional[str] = None
    new_instruction: Optional[str] = None
    rationale: Optional[str] = None

class WorkingMemoryDiff(BaseModel):
    messages_before: int
    messages_after: int
    delta_messages: int
    summary_triggered: bool = False
    new_summary: Optional[str] = None
    estimated_tokens_delta: int = 0
    added_messages: List[Dict[str, str]] = Field(default_factory=list)

class EpisodicMemoryDiff(BaseModel):
    matched_prior_episode: Optional[EpisodicRecord] = None
    new_reflection_created: bool = False
    new_reflection: Optional[EpisodicRecord] = None
    persisted_to_vdb: bool = False

class ProceduralMemoryDiff(BaseModel):
    changed: bool = False
    rule_diffs: List[RuleDiffItem] = Field(default_factory=list)
    rules_before_count: int = 0
    rules_after_count: int = 0

class SemanticMemoryDiff(BaseModel):
    search_query: Optional[str] = None
    retrieved_chunks_count: int = 0
    retrieved_chunks: List[SemanticChunk] = Field(default_factory=list)

class TurnMemoryDiff(BaseModel):
    session_id: str
    turn_id: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    working_diff: WorkingMemoryDiff
    episodic_diff: EpisodicMemoryDiff
    procedural_diff: ProceduralMemoryDiff
    semantic_diff: SemanticMemoryDiff
