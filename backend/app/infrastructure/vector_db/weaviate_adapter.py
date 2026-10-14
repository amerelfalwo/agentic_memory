from typing import List, Optional
import weaviate
from backend.app.domain.models.memory import EpisodicRecord, SemanticChunk
from backend.app.domain.ports.vector_db_port import IVectorDBPort
from backend.app.infrastructure.vector_db.memory_fallback_adapter import InMemoryVectorAdapter
from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("weaviate_adapter")

class WeaviateVectorAdapter(IVectorDBPort):
    def __init__(self):
        self._fallback = InMemoryVectorAdapter()
        self._client = None
        self._is_connected = False
        self._connect()

    def _connect(self):
        try:
            self._client = weaviate.connect_to_local(port=settings.WEAVIATE_PORT)
            self._is_connected = self._client.is_ready()
            if self._is_connected:
                logger.info(f"Connected successfully to local Weaviate on port {settings.WEAVIATE_PORT}")
            else:
                logger.warning("Weaviate is reachable but not ready, using fallback.")
        except Exception as e:
            logger.warning(f"Could not connect to Weaviate: {e}. Active mode: InMemoryFallback.")
            self._client = None
            self._is_connected = False

    def is_connected(self) -> bool:
        return self._is_connected

    def search_semantic(self, query: str, limit: int = 5) -> List[SemanticChunk]:
        if not self._is_connected or not self._client:
            return self._fallback.search_semantic(query, limit)
        try:
            coala_collection = self._client.collections.get("CoALA_Paper")
            memories = coala_collection.query.hybrid(query=query, alpha=0.5, limit=limit)
            chunks = []
            for i, memory in enumerate(memories.objects):
                text = memory.properties.get('chunk', '')
                chunks.append(
                    SemanticChunk(
                        id=str(memory.uuid),
                        chunk_index=i + 1,
                        text=text.strip(),
                        source="CoALA_Paper.pdf",
                        score=round(getattr(memory.metadata, 'score', 0.85) or 0.85, 3)
                    )
                )
            if not chunks:
                return self._fallback.search_semantic(query, limit)
            return chunks
        except Exception as e:
            logger.warning(f"Weaviate semantic query failed ({e}), falling back to memory adapter.")
            return self._fallback.search_semantic(query, limit)

    def search_episodic(self, query: str, limit: int = 1) -> Optional[EpisodicRecord]:
        if not self._is_connected or not self._client:
            return self._fallback.search_episodic(query, limit)
        try:
            episodic_col = self._client.collections.get("episodic_memory")
            memories = episodic_col.query.hybrid(query=query, alpha=0.5, limit=limit)
            if memories.objects:
                props = memories.objects[0].properties
                return EpisodicRecord(
                    id=str(memories.objects[0].uuid),
                    conversation=props.get('conversation', ''),
                    context_tags=props.get('context_tags', []),
                    conversation_summary=props.get('conversation_summary', ''),
                    what_worked=props.get('what_worked', ''),
                    what_to_avoid=props.get('what_to_avoid', '')
                )
            return self._fallback.search_episodic(query, limit)
        except Exception as e:
            logger.warning(f"Weaviate episodic query failed ({e}), falling back to memory adapter.")
            return self._fallback.search_episodic(query, limit)

    def insert_episodic(self, record: EpisodicRecord) -> str:
        # Always insert into fallback store for immediate local consistency
        fallback_id = self._fallback.insert_episodic(record)
        if self._is_connected and self._client:
            try:
                episodic_col = self._client.collections.get("episodic_memory")
                res = episodic_col.data.insert({
                    "conversation": record.conversation,
                    "context_tags": record.context_tags,
                    "conversation_summary": record.conversation_summary,
                    "what_worked": record.what_worked,
                    "what_to_avoid": record.what_to_avoid,
                })
                return str(res)
            except Exception as e:
                logger.warning(f"Weaviate episodic insert failed: {e}")
        return fallback_id
