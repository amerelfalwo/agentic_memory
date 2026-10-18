import threading
from typing import List, Optional
import weaviate
from weaviate.auth import AuthApiKey
from weaviate.classes.config import Property, DataType
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
        self._cached_episodic_col = None
        self._has_coala_paper = False
        self._cached_coala_col = None
        self._connect()

    def _connect(self):
        try:
            url = settings.WEAVIATE_URL or (settings.WEAVIATE_HOST if ("weaviate.cloud" in settings.WEAVIATE_HOST or "weaviate.network" in settings.WEAVIATE_HOST) else "")
            api_key = settings.WEAVIATE_API_KEY
            if url and api_key:
                cluster_url = url if url.startswith("http") else f"https://{url}"
                self._client = weaviate.connect_to_weaviate_cloud(
                    cluster_url=cluster_url,
                    auth_credentials=AuthApiKey(api_key),
                    skip_init_checks=True
                )
                self._is_connected = self._client.is_ready()
                if self._is_connected:
                    logger.info(f"Connected successfully to Weaviate Cloud at {cluster_url}")
                    self._ensure_collections()
                else:
                    logger.warning("Weaviate Cloud connected but not ready.")
            else:
                self._client = weaviate.connect_to_local(port=settings.WEAVIATE_PORT)
                self._is_connected = self._client.is_ready()
                if self._is_connected:
                    logger.info(f"Connected successfully to local Weaviate on port {settings.WEAVIATE_PORT}")
                    self._ensure_collections()
                else:
                    logger.warning("Weaviate is reachable but not ready, using fallback.")
        except Exception as e:
            logger.warning(f"Could not connect to Weaviate: {e}. Active mode: InMemoryFallback.")
            self._client = None
            self._is_connected = False

    def _get_episodic_col(self):
        if not self._client or not self._is_connected:
            return None
        if self._cached_episodic_col is not None:
            return self._cached_episodic_col
        try:
            for name in ["Episodic_memory", "episodic_memory"]:
                if self._client.collections.exists(name):
                    self._cached_episodic_col = self._client.collections.get(name)
                    return self._cached_episodic_col
        except Exception as e:
            logger.warning(f"Error accessing episodic collection: {e}")
        return None

    def _ensure_collections(self):
        if not self._client or not self._is_connected:
            return
        # Ensure episodic_memory
        try:
            col = self._get_episodic_col()
            if not col:
                self._client.collections.create(
                    name="Episodic_memory",
                    properties=[
                        Property(name="conversation", data_type=DataType.TEXT),
                        Property(name="context_tags", data_type=DataType.TEXT_ARRAY),
                        Property(name="conversation_summary", data_type=DataType.TEXT),
                        Property(name="what_worked", data_type=DataType.TEXT),
                        Property(name="what_to_avoid", data_type=DataType.TEXT),
                    ]
                )
                logger.info("Initialized Episodic_memory collection in Weaviate.")
                self._cached_episodic_col = self._client.collections.get("Episodic_memory")
        except Exception as e:
            logger.info(f"Note on episodic collection creation: {e}")

        # Check CoALA_Paper once and cache result
        try:
            if self._client.collections.exists("CoALA_Paper"):
                self._has_coala_paper = True
                self._cached_coala_col = self._client.collections.get("CoALA_Paper")
            else:
                self._has_coala_paper = False
        except Exception as e:
            self._has_coala_paper = False
            logger.info(f"CoALA_Paper semantic search will use fast embedded memory store: {e}")

    def is_connected(self) -> bool:
        return self._is_connected

    def search_semantic(self, query: str, limit: int = 5) -> List[SemanticChunk]:
        if not self._is_connected or not self._client or not self._has_coala_paper:
            return self._fallback.search_semantic(query, limit)
        try:
            if self._cached_coala_col:
                memories = self._cached_coala_col.query.bm25(query=query, limit=limit)
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
                if chunks:
                    return chunks
        except Exception as e:
            logger.warning(f"Weaviate semantic query notice ({e}), using grounded fallback adapter.")
        return self._fallback.search_semantic(query, limit)

    def search_episodic(self, query: str, limit: int = 1) -> Optional[EpisodicRecord]:
        if not self._is_connected or not self._client:
            return self._fallback.search_episodic(query, limit)
        try:
            episodic_col = self._get_episodic_col()
            if episodic_col:
                memories = None
                try:
                    memories = episodic_col.query.bm25(query=query, limit=limit)
                except Exception:
                    memories = episodic_col.query.fetch_objects(limit=limit)

                if memories and memories.objects:
                    props = memories.objects[0].properties
                    return EpisodicRecord(
                        id=str(memories.objects[0].uuid),
                        conversation=props.get('conversation', ''),
                        context_tags=props.get('context_tags', []),
                        conversation_summary=props.get('conversation_summary', ''),
                        what_worked=props.get('what_worked', ''),
                        what_to_avoid=props.get('what_to_avoid', '')
                    )
        except Exception as e:
            logger.warning(f"Weaviate episodic query failed ({e}), using fallback.")
        return self._fallback.search_episodic(query, limit)

    def insert_episodic(self, record: EpisodicRecord) -> str:
        # 1. Immediately insert into local fallback store (< 0.1ms)
        fallback_id = self._fallback.insert_episodic(record)

        # 2. Asynchronously persist to Weaviate Cloud in background so caller is not blocked
        if self._is_connected and self._client:
            def _async_weaviate_insert():
                try:
                    episodic_col = self._get_episodic_col()
                    if episodic_col:
                        res = episodic_col.data.insert({
                            "conversation": record.conversation,
                            "context_tags": record.context_tags,
                            "conversation_summary": record.conversation_summary,
                            "what_worked": record.what_worked,
                            "what_to_avoid": record.what_to_avoid,
                        })
                        logger.info(f"Persisted episodic memory to Weaviate Cloud: {res}")
                except Exception as e:
                    logger.warning(f"Weaviate episodic insert failed: {e}")

            threading.Thread(target=_async_weaviate_insert, daemon=True).start()

        return fallback_id
