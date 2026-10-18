import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Response
from sse_starlette.sse import EventSourceResponse
from backend.app.application.dtos.chat_dtos import (
    ChatRequest,
    ChatResponse,
    ResetSessionRequest,
    ResetSessionResponse
)
from backend.app.application.services.snapshot_service import SnapshotCoordinatorService
from backend.app.presentation.dependencies import get_coordinator_service
from backend.app.core.logging import get_logger

logger = get_logger("chat_router")
router = APIRouter()

@router.post("/chat", response_model=ChatResponse, summary="Execute a multi-turn chat cycle with memory state capture")
def execute_chat(
    req: ChatRequest,
    response: Response,
    coordinator: SnapshotCoordinatorService = Depends(get_coordinator_service)
):
    try:
        result = coordinator.execute_turn(session_id=req.session_id, user_input=req.message)
        if "timing" in result:
            server_timing = coordinator.format_server_timing(result["timing"])
            response.headers["Server-Timing"] = server_timing
        return ChatResponse(
            session_id=result["session_id"],
            turn_id=result["turn_id"],
            response=result["response"],
            security_blocked=result["security_blocked"],
            blocked_reason=result["blocked_reason"],
            snapshot=result["snapshot"],
            diff=result["diff"]
        )
    except Exception as e:
        logger.error(f"Error in chat execution: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream", summary="Server-Sent Events streaming chat turn with real-time memory event telemetry")
async def execute_chat_stream(
    req: ChatRequest,
    coordinator: SnapshotCoordinatorService = Depends(get_coordinator_service)
):
    async def event_generator():
        # Emit initial processing event
        yield {
            "event": "status",
            "data": json.dumps({"status": "analyzing_security", "message": "Evaluating prompt security guardrail..."})
        }
        await asyncio.sleep(0.05)

        # Execute turn
        loop = asyncio.get_event_loop()
        turn_result = await loop.run_in_executor(
            None,
            coordinator.execute_turn,
            req.session_id,
            req.message
        )

        # Emit memory recall telemetry event
        yield {
            "event": "memory_access",
            "data": json.dumps({
                "episodic_matched": turn_result["diff"].episodic_diff.matched_prior_episode is not None,
                "semantic_chunks_count": turn_result["diff"].semantic_diff.retrieved_chunks_count,
                "procedural_rules_active": turn_result["snapshot"].procedural.rules.__len__()
            })
        }
        await asyncio.sleep(0.05)

        # Stream words/tokens of the response smoothly and rapidly
        words = turn_result["response"].split(" ")
        chunk_size = 2
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size]) + (" " if i + chunk_size < len(words) else "")
            yield {
                "event": "token",
                "data": json.dumps({"token": chunk})
            }
            await asyncio.sleep(0.004)

        # Emit final turn diff and snapshot event
        yield {
            "event": "turn_diff",
            "data": json.dumps(turn_result["diff"].model_dump(), default=str)
        }

        server_timing_val = coordinator.format_server_timing(turn_result.get("timing", {}))
        yield {
            "event": "done",
            "data": json.dumps({
                "session_id": turn_result["session_id"],
                "turn_id": turn_result["turn_id"],
                "security_blocked": turn_result["security_blocked"],
                "blocked_reason": turn_result["blocked_reason"],
                "full_response": turn_result["response"],
                "timing": turn_result.get("timing"),
                "server_timing": server_timing_val
            })
        }

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/chat/reset", response_model=ResetSessionResponse, summary="Reset conversation session memory")
def reset_session(
    req: ResetSessionRequest,
    coordinator: SnapshotCoordinatorService = Depends(get_coordinator_service)
):
    coordinator.reset_session(req.session_id)
    return ResetSessionResponse(status="success", session_id=req.session_id)
