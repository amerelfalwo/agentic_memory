# Agentic Memory AI Engine

The Agentic Memory AI Engine is an intelligent agent framework built on Cognitive Architectures for Language Agents (CoALA). It integrates multi-tiered memory systems—procedural, episodic, semantic, and working memory—with security guardrails, LangGraph workflow orchestration, and Weaviate vector search to enable stateful, context-aware AI interactions.

---

## Core Architecture and Features

### 1. Memory Systems (CoALA Framework)
* **Procedural Memory**: Stores actionable system guidelines and response behavior rules (`langgraph/procedural_memory_lg.txt`). Can be edited and saved dynamically through the Streamlit interface.
* **Episodic Memory**: Maintains past interaction records and captures reflections on "what worked" and "what to avoid" for contextual adaptation.
* **Semantic Memory**: Stores factual knowledge chunks in Weaviate Vector DB (such as research papers), retrievable using hybrid vector and text search.
* **Working Memory**: Manages the current conversation state, active messages, and conversation history summarization.

### 2. Security Middleware Guardrail
Intercepts incoming prompts and checks for prompt injection or malicious patterns (such as instructions to override system prompts or bypass rules), terminating execution safely when threats are detected.

### 3. Graph Workflow Orchestration
Powered by LangGraph to structure execution nodes, tool calling, memory management, and conditional routing.

### 4. Interactive Dashboard
Built with Streamlit for inspecting and modifying active procedural rules, reviewing episodic memory recall, inspecting semantic context chunks, and conducting multi-turn chat sessions.

---

## Prerequisites

Before setting up the project, ensure you have the following installed:
* Python 3.10+ (Python 3.14 supported with `uv`)
* `uv` package manager (recommended) or standard `pip`
* Docker (for running local Weaviate Vector DB)
* Groq API Key

---

## Download and Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd agentic_memory
```

### 2. Configure Environment Variables
Copy the example environment file and configure your API key:
```bash
cp .env.example .env
```
Edit `.env` and set your Groq API key:
```env
GROQ_API_KEY=your_groq_api_key_here
model=groq:qwen/qwen3.8-27b
```

### 3. Install Dependencies
Using `uv`:
```bash
uv sync
```
Or using standard `pip`:
```bash
pip install -e .
```

---

## Running the Application

### 1. Start Weaviate Vector DB
Ensure Weaviate is running locally on port 8085:
```bash
docker run -d \
  -p 8085:8080 \
  -p 50051:50051 \
  --name weaviate-agentic-memory \
  semitechnologies/weaviate:latest
```

## Running the Modern Architecture (FastAPI + Next.js)

### 1. Start the FastAPI Backend
Start the high-performance Clean Architecture FastAPI backend server:
```bash
uv run uvicorn backend.app.presentation.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation will be available at:
* Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
* ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 2. Start the Next.js Frontend
In a new terminal, launch the Next.js web application:
```bash
cd frontend
npm run dev
```
Open your browser and navigate to:
* **[http://localhost:3000](http://localhost:3000)**

### 3. Key Capabilities in the Next.js UI
* **Memory Connection Topology Graph**: Interactive React Flow graph visualizing active data pulses between the Agent Core and the 4 memory tiers (Working, Episodic, Semantic, Procedural) plus the Security Guardrail and Tools.
* **Turn-by-Turn Memory Evolution Inspector**: Filter by turn to see granular deltas:
  * ⚡ **Working Memory**: Message counter, token delta, and compression/summarization triggers.
  * 📖 **Episodic Memory**: Matched prior episodes, new reflection tags, what worked, and what to avoid.
  * 📋 **Procedural Guidelines**: Line-by-line diff (`ADDED`, `MODIFIED`, `UNCHANGED`) tracking guideline evolution.
  * 📚 **Semantic Retrieval**: Chunks retrieved from `CoALA_Paper.pdf` with similarity scores.
* **Security Guardrail**: Intercepts prompt injection and prompt overrides in real-time.

---

## Legacy Streamlit Interface (Optional)
If you wish to run the legacy Streamlit prototype:
```bash
uv run streamlit run src/agentic_memory/app.py
```
Accessible at: [http://localhost:8501](http://localhost:8501)

---

## Project Structure

```
agentic_memory/
├── backend/                    # FastAPI Clean Architecture Backend
│   └── app/
│       ├── core/               # Config, logging, security guardrail, exceptions
│       ├── domain/             # Entities, memory models, diff models, ports
│       ├── application/        # DTOs, use cases, memory diff service, snapshot service
│       ├── infrastructure/     # LangGraph runtime, Weaviate/fallback, Groq, repos
│       └── presentation/       # API v1 routers (/chat, /memories, /rules)
├── frontend/                   # Next.js 14+ Frontend (React 19, TypeScript, Tailwind)
│   └── src/
│       ├── app/                # App Router main page & layout
│       ├── components/         # MemoryGraph (React Flow), MemoryDiffInspector, ChatPanel
│       ├── lib/                # API client with SSE streaming support
│       └── types/              # TypeScript contracts
├── langgraph/                  # LangGraph reference notebooks & procedural guidelines
│   ├── agentic_memory_langgraph.ipynb
│   └── procedural_memory_lg.txt
├── CoALA_Paper.pdf             # Academic paper reference
├── pyproject.toml              # Python project metadata & dependencies
├── docker-compose.yml          # Weaviate & Ollama configuration
└── README.md                   # Project documentation
```
