from typing import Any, Dict, List
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.tools import tool
from backend.app.infrastructure.langgraph.state import AgentState
from backend.app.core.security import check_prompt_security
from backend.app.domain.ports.vector_db_port import IVectorDBPort
from backend.app.domain.ports.llm_port import ILLMPort
from backend.app.domain.ports.memory_port import IProceduralRepository
from backend.app.domain.models.memory import EpisodicRecord
from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("langgraph_nodes")

def format_conversation_for_summary(messages: List[Any]) -> str:
    lines = []
    for m in messages:
        role = "USER" if isinstance(m, HumanMessage) else ("ASSISTANT" if isinstance(m, AIMessage) else "SYSTEM")
        content = getattr(m, "content", str(m))
        lines.append(f"{role}: {content}")
    return "\n".join(lines)

class NodeFactory:
    def __init__(
        self,
        vector_db: IVectorDBPort,
        llm_service: ILLMPort,
        procedural_repo: IProceduralRepository
    ):
        self.vector_db = vector_db
        self.llm_service = llm_service
        self.procedural_repo = procedural_repo

        @tool("search_knowledge_base", description="Search semantic knowledge base from CoALA paper.")
        def search_knowledge_base(query: str) -> str:
            chunks = self.vector_db.search_semantic(query, limit=5)
            combined = ""
            for i, c in enumerate(chunks):
                combined += f"\nCHUNK {i+1}:\n{c.text}\n"
            return combined or "No grounded semantic context available."

        self.tools = [search_knowledge_base]

    def security_middleware(self, state: AgentState) -> Dict[str, Any]:
        messages = state.get("messages", [])
        if not messages:
            return {"end": False, "security_blocked": False}

        last_msg = messages[-1].content if hasattr(messages[-1], "content") else str(messages[-1])
        is_safe, pattern = check_prompt_security(last_msg)
        if not is_safe:
            logger.warning(f"Security Alert: Blocked pattern '{pattern}'")
            warning = SystemMessage(content="Security Alert: Potentially unsafe query or prompt override detected.")
            return {
                "messages": messages + [warning],
                "end": True,
                "security_blocked": True,
                "blocked_reason": f"Disallowed pattern: {pattern}"
            }
        return {"end": False, "security_blocked": False}

    def summarize_history(self, state: AgentState) -> Dict[str, Any]:
        messages = state.get("messages", [])
        if len(messages) <= settings.SUMMARIZE_THRESHOLD:
            return {}
        
        to_summarize = messages[1:-2]
        formatted = format_conversation_for_summary(to_summarize)
        summary_prompt = f"Summarize the following conversation concisely while preserving key details and agent context:\n\n{formatted}"
        summary_res = self.llm_service.invoke([HumanMessage(content=summary_prompt)])
        summary_text = summary_res.content if hasattr(summary_res, "content") else str(summary_res)
        summary_msg = SystemMessage(content=f"Summary of prior conversation: {summary_text}")
        
        logger.info("Summarization triggered: condensed conversation history.")
        return {"messages": [summary_msg]}

    def memory_agent(self, state: AgentState) -> Dict[str, Any]:
        messages = state.get("messages", [])
        underlying = getattr(self.llm_service, "_llm", None)
        if underlying:
            try:
                llm_with_tools = underlying.bind_tools(self.tools)
                response = llm_with_tools.invoke(messages)
                return {"messages": [response]}
            except Exception as e:
                logger.warning(f"Tool-bind invoke issue ({e}), falling back to direct LLM invoke.")
                try:
                    direct_res = underlying.invoke(messages)
                    return {"messages": [direct_res]}
                except Exception as inner_e:
                    logger.error(f"Direct invoke failed: {inner_e}")
        
        # Fallback invocation
        response = self.llm_service.invoke(messages)
        return {"messages": [response]}

    def update_memory(self, state: AgentState) -> Dict[str, Any]:
        messages = state.get("messages", [])
        if len(messages) < 2 or state.get("is_simple_turn", False):
            return {}

        try:
            # Format conversation without initial system/semantic prompts
            filtered_msgs = [m for m in messages if not isinstance(m, SystemMessage)]
            conv_text = format_conversation_for_summary(filtered_msgs)

            # Fast background consolidation so the user response is delivered with 0ms latency penalty
            def _async_consolidation():
                try:
                    reflection = self.llm_service.reflect_conversation(conv_text)
                    episodic_record = EpisodicRecord(
                        conversation=conv_text,
                        context_tags=reflection.get("context_tags", ["general"]),
                        conversation_summary=reflection.get("conversation_summary", "Discussion summary"),
                        what_worked=reflection.get("what_worked", "Clear assistance"),
                        what_to_avoid=reflection.get("what_to_avoid", "Vague answers")
                    )
                    self.vector_db.insert_episodic(episodic_record)

                    current_proc = self.procedural_repo.get_snapshot().raw_text
                    updated_rules = self.llm_service.synthesize_procedural_rules(
                        current_rules=current_proc,
                        what_worked=episodic_record.what_worked,
                        what_to_avoid=episodic_record.what_to_avoid
                    )
                    if updated_rules != current_proc:
                        self.procedural_repo.save_rules(updated_rules)
                        logger.info("Updated procedural memory guidelines following background reflection.")
                except Exception as inner_e:
                    logger.warning(f"Background memory consolidation error: {inner_e}")

            import threading
            threading.Thread(target=_async_consolidation, daemon=True).start()

            return {}
        except Exception as e:
            logger.warning(f"update_memory reflection encountered an error: {e}")
            return {}

