from abc import ABC, abstractmethod
from typing import List, Any, AsyncIterator, Dict

class ILLMPort(ABC):
    @abstractmethod
    def invoke(self, messages: List[Any]) -> Any:
        """Synchronous LLM invoke."""
        pass

    @abstractmethod
    def stream(self, messages: List[Any]) -> Any:
        """Streaming generator for token responses."""
        pass

    @abstractmethod
    def reflect_conversation(self, conversation_text: str) -> Dict[str, Any]:
        """Extracts structured episodic reflections (what worked, what to avoid)."""
        pass

    @abstractmethod
    def synthesize_procedural_rules(self, current_rules: str, what_worked: str, what_to_avoid: str) -> str:
        """Synthesizes updated procedural rules based on new feedback."""
        pass
