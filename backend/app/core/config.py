import os
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load root .env if present
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

class Settings(BaseModel):
    PROJECT_NAME: str = "Mnemos — Cognitive Memory AI Engine"
    API_V1_PREFIX: str = "/api/v1"
    GROQ_API_KEY: str = Field(default_factory=lambda: os.getenv("GROQ_API_KEY", ""))
    MODEL_NAME: str = Field(default_factory=lambda: os.getenv("model", "groq:qwen/qwen3.8-27b").replace("groq:", ""))
    WEAVIATE_HOST: str = Field(default_factory=lambda: os.getenv("WEAVIATE_HOST", "localhost"))
    WEAVIATE_PORT: int = Field(default_factory=lambda: int(os.getenv("WEAVIATE_PORT", "8085")))
    WEAVIATE_URL: str = Field(default_factory=lambda: (
        os.getenv("WEAVIATE_URL") or 
        os.getenv("WCS_URL") or 
        os.getenv("WEAVIATE_CLUSTER_URL") or 
        os.getenv("WEAVIATE_ENDPOINT") or 
        (os.getenv("WEAVIATE_HOST", "") if "weaviate.cloud" in os.getenv("WEAVIATE_HOST", "") else "")
    ))
    WEAVIATE_API_KEY: str = Field(default_factory=lambda: (
        os.getenv("WEAVIATE_API_KEY") or 
        os.getenv("WCS_API_KEY") or 
        os.getenv("WEAVIATE_KEY") or 
        os.getenv("WAVELET_API_KEY") or 
        ""
    ))
    PROCEDURAL_FILE_PATH: Path = Field(
        default_factory=lambda: ROOT_DIR / "langgraph" / "procedural_memory_lg.txt"
    )
    COALA_PDF_PATH: Path = Field(
        default_factory=lambda: ROOT_DIR / "CoALA_Paper.pdf"
    )
    SUMMARIZE_THRESHOLD: int = 10
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]

settings = Settings()
