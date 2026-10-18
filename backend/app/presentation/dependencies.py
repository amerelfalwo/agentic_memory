from functools import lru_cache
from backend.app.infrastructure.vector_db.weaviate_adapter import WeaviateVectorAdapter
from backend.app.infrastructure.llm.groq_adapter import GroqLLMAdapter
from backend.app.infrastructure.repositories.procedural_repo import FileProceduralRepository
from backend.app.infrastructure.repositories.audit_repo import InMemoryAuditRepository
from backend.app.application.services.snapshot_service import SnapshotCoordinatorService

@lru_cache()
def get_vector_db() -> WeaviateVectorAdapter:
    return WeaviateVectorAdapter()

@lru_cache()
def get_llm_service() -> GroqLLMAdapter:
    return GroqLLMAdapter()

@lru_cache()
def get_procedural_repo() -> FileProceduralRepository:
    return FileProceduralRepository()

@lru_cache()
def get_audit_repo() -> InMemoryAuditRepository:
    return InMemoryAuditRepository()

@lru_cache()
def get_coordinator_service() -> SnapshotCoordinatorService:
    return SnapshotCoordinatorService(
        vector_db=get_vector_db(),
        llm_service=get_llm_service(),
        procedural_repo=get_procedural_repo(),
        audit_repo=get_audit_repo()
    )
