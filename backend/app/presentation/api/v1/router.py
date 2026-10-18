from fastapi import APIRouter
from backend.app.presentation.api.v1.chat import router as chat_router
from backend.app.presentation.api.v1.memories import router as memories_router
from backend.app.presentation.api.v1.rules import router as rules_router

api_v1_router = APIRouter()

api_v1_router.include_router(chat_router, tags=["Chat"])
api_v1_router.include_router(memories_router, tags=["Memories & Topology"])
api_v1_router.include_router(rules_router, tags=["Procedural Guidelines"])
