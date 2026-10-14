from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from backend.app.infrastructure.langgraph.state import AgentState
from backend.app.infrastructure.langgraph.nodes import NodeFactory
from backend.app.core.config import settings

def should_summarize(state: AgentState) -> str:
    messages = state.get("messages", [])
    if len(messages) > settings.SUMMARIZE_THRESHOLD:
        return "summarize"
    return "continue"

def check_security(state: AgentState) -> str:
    if state.get("end") or state.get("security_blocked"):
        return "blocked"
    return "safe"

def create_memory_graph(node_factory: NodeFactory):
    builder = StateGraph(AgentState)

    builder.add_node("security_middleware", node_factory.security_middleware)
    builder.add_node("summarize_history", node_factory.summarize_history)
    builder.add_node("memory_agent", node_factory.memory_agent)
    builder.add_node("mcp_tools_node", ToolNode(node_factory.tools))
    builder.add_node("update_memory", node_factory.update_memory)

    # Edges
    builder.add_edge(START, "security_middleware")
    builder.add_conditional_edges(
        "security_middleware",
        check_security,
        {"blocked": END, "safe": "summarize_history"}
    )
    builder.add_edge("summarize_history", "memory_agent")
    builder.add_conditional_edges(
        "memory_agent",
        tools_condition,
        {"tools": "mcp_tools_node", END: END}
    )
    builder.add_edge("mcp_tools_node", "memory_agent")

    return builder.compile()
