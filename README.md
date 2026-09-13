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

### 2. Run the Streamlit UI
Start the Streamlit application using `uv`:
```bash
uv run streamlit run src/agentic_memory/app.py
```
Or directly with Streamlit:
```bash
streamlit run src/agentic_memory/app.py
```

### 3. Access the Dashboard
Open your browser and navigate to:
```
http://localhost:8501
```

---

## Project Structure

```
agentic_memory/
├── src/
│   └── agentic_memory/
│       ├── __init__.py
│       └── app.py              # Main Streamlit application and LangGraph workflow
├── langgraph/
│   ├── agentic_memory_langgraph.ipynb
│   └── procedural_memory_lg.txt # Active procedural rules
├── CoALA_Paper.pdf             # Reference academic paper on agent cognitive architecture
├── pyproject.toml              # Dependencies and project metadata
├── .env.example                # Template for environment configuration
└── README.md                   # Project documentation
```
