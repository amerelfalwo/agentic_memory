from abc import ABC, abstractmethod
from typing import List, Optional
from backend.app.domain.models.memory import EpisodicRecord, SemanticChunk

class IVectorDBPort(ABC):
    @abstractmethod
    def is_connected(self) -> bool:
        """Returns True if the vector database is reachable."""
        pass

    @abstractmethod
    def search_semantic(self, query: str, limit: int = 5) -> List[SemanticChunk]:
        """Hybrid/vector search over semantic knowledge chunks."""
        pass

    @abstractmethod
    def search_episodic(self, query: str, limit: int = 1) -> Optional[EpisodicRecord]:
        """Search prior episodic memories for similar conversations."""
        pass

    @abstractmethod
    def insert_episodic(self, record: EpisodicRecord) -> str:
        """Persists a new reflection episode to vector storage."""
        pass
