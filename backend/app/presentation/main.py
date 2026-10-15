import time
import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.logging import get_logger
from backend.app.core.exceptions import DomainException
from backend.app.presentation.api.v1.router import api_v1_router
from backend.app.presentation.dependencies import get_vector_db, get_llm_service

logger = get_logger("main")

app = FastAPI(
    title="Mnemos",
    description="Mnemos Enterprise Cognitive Memory AI Engine based on CoALA Architecture, LangGraph, and FastAPI.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request tracking middleware
@app.middleware("http")
async def add_process_time_and_trace_id(request: Request, call_next):
    trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4()))
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Trace-Id"] = trace_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

# Standardized structured domain exception handler
@app.exception_handler(DomainException)
async def domain_exception_handler(request: Request, exc: DomainException):
    trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
    logger.warning(f"DomainException [{exc.code}]: {exc.message}")
    return JSONResponse(
        status_code=400,
        content={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
            "traceId": trace_id
        }
    )

# Include API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_PREFIX}/health", tags=["Health"])
def health_check():
    vdb = get_vector_db()
    llm = get_llm_service()
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "vector_db_connected": vdb.is_connected(),
        "vector_db_mode": "Weaviate" if vdb.is_connected() else "InMemoryFallback",
        "llm_connected": llm.is_live(),
        "model": settings.MODEL_NAME
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.presentation.main:app", host="0.0.0.0", port=8000, reload=True)
