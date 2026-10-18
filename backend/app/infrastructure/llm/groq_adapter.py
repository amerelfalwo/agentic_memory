import json
import re
from typing import List, Any, Dict, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from backend.app.domain.ports.llm_port import ILLMPort
from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("groq_adapter")

REFLECTION_PROMPT_TEMPLATE = """You are analyzing conversations about research papers and agent cognitive architectures to create memories that will help guide future interactions. Your task is to extract key elements that would be most helpful when encountering similar discussions in the future.

Review the conversation and create a memory reflection following these rules:
1. For any field where you don't have enough information or the field isn't relevant, use "N/A"
2. Be extremely concise - each string should be one clear, actionable sentence
3. Focus only on information that would be useful for handling similar future conversations
4. Context_tags should be specific enough to match similar situations but general enough to be reusable

Output valid JSON in exactly this format:
{{
    "context_tags": ["string"],
    "conversation_summary": "string",
    "what_worked": "string",
    "what_to_avoid": "string"
}}

Here is the prior conversation:
{conversation}
"""

PROCEDURAL_SYNTHESIS_TEMPLATE = """You are maintaining a continuously updated list of the most important procedural behavior instructions for an AI assistant. Your task is to refine and improve a list of key takeaways based on new conversation feedback while maintaining the most valuable existing insights.

CURRENT TAKEAWAYS:
{current_takeaways}

NEW FEEDBACK:
What Worked Well:
{what_worked}

What To Avoid:
{what_to_avoid}

Please generate an updated list of up to 10 key takeaways that combines:
1. The most valuable insights from the current takeaways
2. New learnings from the recent feedback
3. Any synthesized insights combining multiple learnings

Requirements for each takeaway:
- Must be specific and actionable
- Should address a distinct aspect of behavior
- Include a clear rationale
- Written in imperative form (e.g., "Maintain conversation context by...")

Format each takeaway as:
[#]. [Instruction] - [Brief rationale]

Return up to but no more than 10 takeaways. Return just the list, no preamble or explanation."""

class GroqLLMAdapter(ILLMPort):
    def __init__(self):
        self._api_key = settings.GROQ_API_KEY
        self._model_name = settings.MODEL_NAME
        self._llm = None
        self._init_llm()

    def _init_llm(self):
        if self._api_key and self._api_key.strip() and self._api_key != "your_key_here":
            try:
                self._llm = ChatGroq(
                    api_key=self._api_key,
                    model=self._model_name,
                    temperature=0.7
                )
                logger.info(f"Initialized ChatGroq with model: {self._model_name}")
            except Exception as e:
                logger.error(f"Failed to initialize ChatGroq: {e}. Falling back to simulated LLM.")
                self._llm = None
        else:
            logger.warning("No valid GROQ_API_KEY detected in .env. Running in simulated intelligent agent mode.")
            self._llm = None

    def is_live(self) -> bool:
        return self._llm is not None

    def get_underlying_llm(self):
        return self._llm

    def invoke(self, messages: List[Any]) -> Any:
        if self._llm:
            try:
                return self._llm.invoke(messages)
            except Exception as e:
                logger.error(f"Groq API call error: {e}. Providing fallback.")
        
        # Fallback simulation
        last_msg = messages[-1].content if hasattr(messages[-1], "content") else str(messages[-1])
        return AIMessage(
            content=f"[Agentic Memory Response]: Based on your query '{last_msg[:60]}...', the CoALA framework coordinates 4 memory modules: Working Memory (active context buffer), Episodic Memory (past reflection recall), Semantic Memory (vectorized paper chunks), and Procedural Memory (10 behavioral rules). All memories have been synchronized for this turn."
        )

    def stream(self, messages: List[Any]):
        if self._llm:
            try:
                for chunk in self._llm.stream(messages):
                    if chunk.content:
                        yield chunk.content
                return
            except Exception as e:
                logger.error(f"Groq stream error: {e}")
        
        # Fallback generator
        response = self.invoke(messages).content
        words = response.split(" ")
        for word in words:
            yield word + " "

    def reflect_conversation(self, conversation_text: str) -> Dict[str, Any]:
        if self._llm:
            try:
                prompt = ChatPromptTemplate.from_template(REFLECTION_PROMPT_TEMPLATE)
                chain = prompt | self._llm | JsonOutputParser()
                res = chain.invoke({"conversation": conversation_text})
                if isinstance(res, dict) and "conversation_summary" in res:
                    return res
            except Exception as e:
                logger.warning(f"Groq reflection chain failed: {e}")

        # Intelligent default reflection
        lines = [l for l in conversation_text.split("\n") if l.strip()]
        last_topic = lines[-1][:40] if lines else "General Research"
        return {
            "context_tags": ["agentic_memory", "coala", "interaction"],
            "conversation_summary": f"Discussion regarding {last_topic}.",
            "what_worked": "Grounded responses referencing cognitive memory systems.",
            "what_to_avoid": "Omitting explicit citations or failing to verify guardrail security."
        }

    def synthesize_procedural_rules(self, current_rules: str, what_worked: str, what_to_avoid: str) -> str:
        if self._llm:
            try:
                prompt = PROCEDURAL_SYNTHESIS_TEMPLATE.format(
                    current_takeaways=current_rules,
                    what_worked=what_worked,
                    what_to_avoid=what_to_avoid
                )
                res = self._llm.invoke(prompt)
                if res and res.content and "1." in res.content:
                    return res.content.strip()
            except Exception as e:
                logger.warning(f"Procedural rule synthesis failed: {e}")

        # Conservative fallback: return current rules
        return current_rules
