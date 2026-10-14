from fastapi import APIRouter, Depends, HTTPException
from backend.app.application.dtos.memory_dtos import UpdateProceduralRequest, ProceduralResponse
from backend.app.application.services.snapshot_service import SnapshotCoordinatorService
from backend.app.presentation.dependencies import get_coordinator_service
from backend.app.core.logging import get_logger

logger = get_logger("rules_router")
router = APIRouter()

@router.get("/memories/procedural", response_model=ProceduralResponse, summary="Get active procedural guidelines")
def get_procedural_rules(
    coordinator: SnapshotCoordinatorService = Depends(get_coordinator_service)
):
    snap = coordinator.procedural_repo.get_snapshot()
    return ProceduralResponse(rules=snap.rules, raw_text=snap.raw_text)

@router.put("/memories/procedural", response_model=ProceduralResponse, summary="Update active procedural guidelines")
def update_procedural_rules(
    req: UpdateProceduralRequest,
    coordinator: SnapshotCoordinatorService = Depends(get_coordinator_service)
):
    try:
        snap = coordinator.procedural_repo.save_rules(req.rules_text)
        return ProceduralResponse(rules=snap.rules, raw_text=snap.raw_text)
    except Exception as e:
        logger.error(f"Failed to update procedural rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))
