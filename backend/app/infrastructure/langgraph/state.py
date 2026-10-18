from typing_extensions import TypedDict
from typing import List, Optional, Any, Dict, Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict, total=False):
    messages: Annotated[List[Any], add_messages]
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
    memory_context: Optional[Dict[str, Any]]
    timing_data: Optional[Dict[str, Any]]
    is_simple_turn: bool

