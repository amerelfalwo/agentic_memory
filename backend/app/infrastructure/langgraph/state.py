from typing_extensions import TypedDict
from typing import List, Optional, Any, Dict

class AgentState(TypedDict, total=False):
    messages: List[Any]
    semantic_memory: str
    procedural_memory: str
    prior_conversations: List[str]
    what_worked: List[str]
    what_to_avoid: List[str]
    end: bool
    session_id: str
    turn_id: int
    security_blocked: bool
    blocked_reason: Optional[str]
    retrieved_chunks: List[Dict[str, Any]]
