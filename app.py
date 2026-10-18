import os

# Prevent Gradio 5.x from attempting Node.js SSR port splitting (moving Python to port 7861)
os.environ["GRADIO_NODE_PATH"] = ""
os.environ["GRADIO_SSR_MODE"] = "false"
os.environ["GRADIO_SERVER_PORT"] = "7860"
os.environ["GRADIO_SERVER_NAME"] = "0.0.0.0"

import uvicorn
import gradio as gr
from backend.app.presentation.main import app as fastapi_app

# Interactive Dashboard for Hugging Face Space visitors
with gr.Blocks(title="Mnemos — Cognitive Memory AI Engine") as demo:
    gr.Markdown("""
    # 🧠 Mnemos — Cognitive Memory AI Engine
    ### CoALA Cognitive Architecture & LangGraph Backend
    
    The backend is **online and serving API requests** for the frontend application.
    
    - 📖 **Interactive Swagger UI**: [/docs](/docs)
    - 🩺 **System Health**: [/health](/health)
    - ⚡ **API Base Endpoint**: `/api/v1`
    - 🌐 **Production Frontend**: [https://rapid-geode-upm1g2t.vercel.app](https://rapid-geode-upm1g2t.vercel.app)
    """)

# Mount Gradio onto the existing FastAPI application
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    # Hugging Face Spaces expects traffic strictly on port 7860.
    # Do NOT read dynamic $PORT, as HF container environment may pass auxiliary proxy ports (e.g. 7861)
    uvicorn.run(app, host="0.0.0.0", port=7860)

