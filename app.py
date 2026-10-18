import os

# Prevent Gradio 5.x from attempting Node.js SSR port splitting (moving Python to port 7861)
os.environ["GRADIO_NODE_PATH"] = ""
os.environ["GRADIO_SSR_MODE"] = "false"
os.environ["GRADIO_SERVER_PORT"] = "7860"
os.environ["GRADIO_SERVER_NAME"] = "0.0.0.0"

import uvicorn
import gradio as gr
from backend.app.presentation.main import app as fastapi_app

# ZeroGPU decorator for Hugging Face Spaces (zero-a10g hardware requires at least one registered event fn)
try:
    import spaces
    @spaces.GPU
    def echo_status(prompt: str) -> str:
        """ZeroGPU registered handler to satisfy Hugging Face startup validation."""
        return f"Mnemos Cognitive Engine is online! Echo: {prompt}"
except Exception:
    def echo_status(prompt: str) -> str:
        return f"Mnemos Cognitive Engine is online! Echo: {prompt}"

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
    
    with gr.Row():
        inp = gr.Textbox(label="Test Prompt", placeholder="Say hello to Mnemos...", scale=4)
        btn = gr.Button("Send Probe", variant="primary", scale=1)
    out = gr.Textbox(label="Backend Response", interactive=False)
    
    btn.click(fn=echo_status, inputs=inp, outputs=out)
    inp.submit(fn=echo_status, inputs=inp, outputs=out)

# Mount Gradio onto the existing FastAPI application
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    # Hugging Face Spaces expects traffic strictly on port 7860.
    uvicorn.run(app, host="0.0.0.0", port=7860)
