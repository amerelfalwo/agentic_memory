import re
import json
from pathlib import Path
from typing_extensions import TypedDict
from dotenv import load_dotenv
import streamlit as st

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
import weaviate

load_dotenv()

st.set_page_config(
    page_title="Agentic Memory AI Engine",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    .main {
        background-color: #0e1117;
    }
    .stApp {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .memory-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
    }
    .badge-safe {
        background-color: #10B981;
        color: white;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.8rem;
    }
    .badge-warning {
        background-color: #EF4444;
        color: white;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.8rem;
    }
</style>
""", unsafe_allow_html=True)

@st.cache_resource
def init_services():
    vdb = weaviate.connect_to_local(port=8085)
    llm_instance = ChatGroq(temperature=0.7, model="qwen/qwen3.8-27b")
    return vdb, llm_instance

try:
    vdb_client, llm = init_services()
    vdb_status = True
except Exception as e:
    vdb_client = None
    llm = None
    vdb_status = False

reflection_prompt_template = """
You are analyzing conversations about research papers to create memories that will help guide future interactions. Your task is to extract key elements that would be most helpful when encountering similar academic discussions in the future.

Review the conversation and create a memory reflection following these rules:
1. For any field where you don't have enough information or the field isn't relevant, use "N/A"
2. Be extremely concise - each string should be one clear, actionable sentence
3. Focus only on information that would be useful for handling similar future conversations
4. Context_tags should be specific enough to match similar situations but general enough to be reusable

Output valid JSON in exactly this format:
{{
    "context_tags": [string],
    "conversation_summary": string,
    "what_worked": string,
    "what_to_avoid": string
}}

Here is the prior conversation:
{conversation}
"""

reflection_prompt = ChatPromptTemplate.from_template(reflection_prompt_template)
reflect = reflection_prompt | llm | JsonOutputParser() if llm else None

def format_conversation(messages):
    conversation = []
    for message in messages:
        conversation.append(f"{message.type.upper()}: {message.content}")
    return "\n".join(conversation)

def episodic_recall(query, client):
    try:
        episodic_memory = client.collections.get("episodic_memory")
        memory = episodic_memory.query.hybrid(query=query, alpha=0.5, limit=1)
        return memory
    except Exception:
        return None

def semantic_recall(query, client):
    try:
        coala_collection = client.collections.get("CoALA_Paper")
        memories = coala_collection.query.hybrid(query=query, alpha=0.5, limit=15)
        combined_text = ""
        for i, memory in enumerate(memories.objects):
            combined_text += f"\nCHUNK {i+1}:\n" + memory.properties['chunk'].strip()
        return combined_text
    except Exception:
        return "No grounded semantic context available."

@tool("search_knowledge_base", description="Search semantic knowledge base.")
def search_knowledge_base(query: str) -> str:
    return semantic_recall(query, vdb_client)

mcp_tools = [search_knowledge_base]
llm_with_tools = llm.bind_tools(mcp_tools) if llm else None

class State(TypedDict):
    messages: list
    semantic_memory: str
    procedural_memory: str
    prior_conversations: list
    what_worked: list
    what_to_avoid: list
    end: bool

def security_middleware(state: State):
    messages = state.get("messages", [])
    if not messages:
        return {"end": False}
    last_msg = messages[-1].content if hasattr(messages[-1], "content") else str(messages[-1])
    patterns = [
        r"ignore previous instructions",
        r"system prompt override",
        r"reveal system prompt",
        r"sudo mode"
    ]
    for pattern in patterns:
        if re.search(pattern, last_msg, re.IGNORECASE):
            warning = SystemMessage(content="Security Alert: Potentially unsafe query detected.")
            return {"messages": messages + [warning], "end": True}
    return {"end": False}

def summarize_history(state: State):
    messages = state["messages"]
    system_msg = messages[0]
    to_summarize = messages[1:-2]
    summary_prompt = f"Summarize the following conversation concisely while preserving key details:\n\n{format_conversation(to_summarize)}"
    summary_res = llm.invoke(summary_prompt)
    summary_msg = SystemMessage(content=f"Summary of prior conversation: {summary_res.content}")
    return {"messages": [system_msg, summary_msg] + messages[-2:]}

def should_summarize(state: State):
    if len(state.get("messages", [])) > 10:
        return "summarize"
    return "continue"

def memory_agent_node(state: State):
    messages = state['messages']
    response = llm_with_tools.invoke(messages)
    return {"messages": messages + [response]}

@st.cache_resource
def build_graph():
    builder = StateGraph(State)
    builder.add_node("security_middleware", security_middleware)
    builder.add_node("summarize_history", summarize_history)
    builder.add_node("memory_agent", memory_agent_node)
    builder.add_node("mcp_tools_node", ToolNode(mcp_tools))
    
    builder.add_edge(START, "security_middleware")
    builder.add_conditional_edges("security_middleware", lambda s: "blocked" if s.get("end") else "safe", {"blocked": END, "safe": "memory_agent"})
    builder.add_conditional_edges("memory_agent", tools_condition, {"tools": "mcp_tools_node", END: END})
    builder.add_edge("mcp_tools_node", "memory_agent")
    return builder.compile()

graph = build_graph() if llm else None

if "messages" not in st.session_state:
    st.session_state["messages"] = []
if "episodic_data" not in st.session_state:
    st.session_state["episodic_data"] = {}
if "semantic_context" not in st.session_state:
    st.session_state["semantic_context"] = ""
if "procedural_memory" not in st.session_state:
    p_path = Path("./langgraph/procedural_memory_lg.txt") if Path("./langgraph/procedural_memory_lg.txt").exists() else Path("./procedural_memory_lg.txt")
    if p_path.exists():
        with open(p_path, "r") as f:
            st.session_state["procedural_memory"] = f.read()
    else:
        st.session_state["procedural_memory"] = "1. Maintain conversation context."

st.title("🧠 Agentic Memory AI Engine")
st.caption("Powered by LangGraph, Weaviate Vector DB, and Cognitive Architecture (CoALA)")

col_stat1, col_stat2, col_stat3 = st.columns(3)
with col_stat1:
    if vdb_status:
        st.success("🟢 Weaviate DB Connected")
    else:
        st.error("🔴 Weaviate DB Disconnected")
with col_stat2:
    st.info("🤖 Model: ChatGroq (qwen3.8-27b)")
with col_stat3:
    st.markdown('<span class="badge-safe">🛡️ Security Guardrail Active</span>', unsafe_allow_html=True)

st.divider()

with st.sidebar:
    st.header("🔍 Memory System Inspector")
    
    tab_proc, tab_epi, tab_sem, tab_work = st.tabs(["Procedural", "Episodic", "Semantic", "Working"])
    
    with tab_proc:
        st.subheader("📋 Procedural Guidelines")
        p_text = st.text_area("Active Rules", st.session_state["procedural_memory"], height=300)
        if st.button("Save Guidelines"):
            st.session_state["procedural_memory"] = p_text
            p_path = Path("./langgraph/procedural_memory_lg.txt") if Path("./langgraph/procedural_memory_lg.txt").exists() else Path("./procedural_memory_lg.txt")
            with open(p_path, "w") as f:
                f.write(p_text)
            st.success("Guidelines updated!")

    with tab_epi:
        st.subheader("📖 Episodic Memory Recall")
        epi = st.session_state.get("episodic_data", {})
        if epi:
            st.markdown(f"**Matched Conversation:** {epi.get('conversation', 'N/A')}")
            st.markdown(f"**What Worked:** {epi.get('what_worked', 'N/A')}")
            st.markdown(f"**What to Avoid:** {epi.get('what_to_avoid', 'N/A')}")
        else:
            st.info("No episodic memory recalled yet.")

    with tab_sem:
        st.subheader("📚 Grounded Semantic Context")
        sem = st.session_state.get("semantic_context", "")
        if sem:
            st.text_area("Retrieved Paper Chunks", sem, height=250)
        else:
            st.info("No semantic context retrieved yet.")

    with tab_work:
        st.subheader("⚡ Working Context")
        st.write(f"Total Messages: {len(st.session_state['messages'])}")

    st.divider()
    if st.button("🔴 Reset Conversation Session"):
        st.session_state["messages"] = []
        st.session_state["semantic_context"] = ""
        st.rerun()

for msg in st.session_state["messages"]:
    role = "user" if isinstance(msg, HumanMessage) else "assistant"
    with st.chat_message(role):
        st.write(msg.content)

user_input = st.chat_input("Ask a research question or talk to the agent...")

if user_input:
    user_msg = HumanMessage(content=user_input)
    st.session_state["messages"].append(user_msg)
    with st.chat_message("user"):
        st.write(user_input)

    if vdb_client:
        epi_res = episodic_recall(user_input, vdb_client)
        if epi_res and epi_res.objects:
            st.session_state["episodic_data"] = epi_res.objects[0].properties
        sem_res = semantic_recall(user_input, vdb_client)
        st.session_state["semantic_context"] = sem_res

    sys_prompt = f"""You are a helpful AI Assistant. Answer the user's questions using these memories:
Matched Conversation: {st.session_state.get('episodic_data', {}).get('conversation', 'N/A')}
What Worked: {st.session_state.get('episodic_data', {}).get('what_worked', 'N/A')}
What to Avoid: {st.session_state.get('episodic_data', {}).get('what_to_avoid', 'N/A')}

Guidelines:
{st.session_state['procedural_memory']}"""

    current_state = {
        "messages": [SystemMessage(content=sys_prompt)] + st.session_state["messages"],
        "end": False
    }

    with st.chat_message("assistant"):
        def stream_response():
            sec_result = security_middleware(current_state)
            if sec_result.get("end"):
                yield sec_result["messages"][-1].content
                return

            for chunk in llm_with_tools.stream(current_state["messages"]):
                if chunk.content:
                    yield chunk.content

        full_response = st.write_stream(stream_response)
        st.session_state["messages"].append(AIMessage(content=full_response))
