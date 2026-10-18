from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.domain.models.diff import TurnMemoryDiff
from backend.app.domain.models.memory import FullMemorySnapshot

class ChatRequest(BaseModel):
    session_id: str = Field(default="default-session", description="Conversation session ID")
    message: str = Field(..., min_length=1, description="User prompt message")

class ChatResponse(BaseModel):
    session_id: str
    turn_id: int
    response: str
    security_blocked: bool = False
    blocked_reason: Optional[str] = None
    snapshot: FullMemorySnapshot
    diff: TurnMemoryDiff

class ResetSessionRequest(BaseModel):
    session_id: str = "default-session"

class ResetSessionResponse(BaseModel):
    status: str
    session_id: str
