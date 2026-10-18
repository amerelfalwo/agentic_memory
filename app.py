import os
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
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
