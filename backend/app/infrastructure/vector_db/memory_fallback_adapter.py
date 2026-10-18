import re
import math
from typing import List, Optional, Dict
from pydantic import BaseModel
from backend.app.domain.models.memory import EpisodicRecord, SemanticChunk
from backend.app.domain.ports.vector_db_port import IVectorDBPort
from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("memory_fallback_adapter")

class InMemoryVectorAdapter(IVectorDBPort):
    """
    In-memory fallback vector adapter for zero-downtime execution
    when Weaviate Docker container is unreachable.
    """
    def __init__(self):
        self._episodic_store: List[EpisodicRecord] = []
        self._semantic_chunks: List[SemanticChunk] = []
        self._seed_default_data()

    def _seed_default_data(self):
        # Default seeded episodic memories
        self._episodic_store.append(
            EpisodicRecord(
                id="seed-epi-1",
                conversation="USER: Can you explain the difference between working and episodic memory in agents?\nASSISTANT: Working memory holds immediate active context and dialogue state, whereas episodic memory records past experiences, reflection tags, and what worked or what to avoid.",
                context_tags=["memory_types", "coala_architecture", "conceptual"],
                conversation_summary="Comparison between working and episodic memory in agent cognitive systems.",
                what_worked="Clear categorization using CoALA framework definitions.",
                what_to_avoid="Conflating short-term conversational context with persistent episodic reflections."
            )
        )
        self._episodic_store.append(
            EpisodicRecord(
                id="seed-epi-2",
                conversation="USER: How does procedural memory adapt over time?\nASSISTANT: Procedural memory maintains executable behavior rules and golden guidelines. When conversation concludes or user feedback is provided, a reflection prompt synthesizes new takeaways and refines the guidelines.",
                context_tags=["procedural_memory", "guidelines_evolution", "reflection"],
                conversation_summary="Explanation of procedural memory updates through automated reflection cycles.",
                what_worked="Structured imperative guidelines formatted with instruction and rationale.",
                what_to_avoid="Overwriting entire rulebase without preserving existing high-value takeaways."
            )
        )

        # Seed semantic chunks from CoALA concepts
        seed_chunks = [
            "CoALA (Cognitive Architectures for Language Agents) structures memory into Working Memory, Episodic Memory, Semantic Memory, and Procedural Memory.",
            "Working memory maintains the current state of execution, including the dialogue history, intermediate reasoning traces, and current sensory inputs.",
            "Episodic memory stores sequences of past agent experiences, enabling retrieval of similar situations to guide current decision-making and prevent repeating past mistakes.",
            "Semantic memory stores declarative world knowledge and factual documents, often indexed in vector databases for hybrid dense and sparse retrieval.",
            "Procedural memory encodes the agent's internalized skills, rules of thumb, and executable guidelines that dictate how tasks and dialogue turns are executed.",
            "The Decision-Making cycle in CoALA alternates between Planning, Execution, and Evaluation, updating memory stores during state transitions."
        ]
        
        # If PDF exists, attempt to extract additional text
        if settings.COALA_PDF_PATH.exists():
            try:
                from pypdf import PdfReader
                reader = PdfReader(str(settings.COALA_PDF_PATH))
                extracted_text = ""
                for page in reader.pages[:10]: # Extract first 10 pages
                    txt = page.extract_text()
                    if txt:
                        extracted_text += " " + txt
                
                # Split into chunks of ~500 chars
                words = extracted_text.split()
                chunk_size = 80
                for i in range(0, min(len(words), 800), chunk_size):
                    chunk_text = " ".join(words[i:i + chunk_size])
                    seed_chunks.append(chunk_text)
            except Exception as e:
                logger.warning(f"Could not parse PDF for fallback seed: {e}")

        for i, text in enumerate(seed_chunks):
            self._semantic_chunks.append(
                SemanticChunk(
                    id=f"sem-{i+1}",
                    chunk_index=i + 1,
                    text=text,
                    source="CoALA_Paper.pdf",
                    score=1.0
                )
            )

    def is_connected(self) -> bool:
        return True

    def _calculate_overlap(self, query: str, text: str) -> float:
        q_words = set(re.findall(r"\w+", query.lower()))
        t_words = set(re.findall(r"\w+", text.lower()))
        if not q_words or not t_words:
            return 0.0
        intersection = q_words.intersection(t_words)
        return len(intersection) / math.sqrt(len(q_words) * len(t_words))

    def search_semantic(self, query: str, limit: int = 5) -> List[SemanticChunk]:
        scored_chunks = []
        for chunk in self._semantic_chunks:
            score = self._calculate_overlap(query, chunk.text)
            scored_chunks.append((score, chunk))
        
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, chunk in scored_chunks[:limit]:
            chunk_copy = chunk.model_copy()
            chunk_copy.score = round(score + 0.5, 3) if score > 0 else 0.5
            results.append(chunk_copy)
        return results

    def search_episodic(self, query: str, limit: int = 1) -> Optional[EpisodicRecord]:
        if not self._episodic_store:
            return None
        scored_episodes = []
        for ep in self._episodic_store:
            haystack = f"{ep.conversation} {ep.conversation_summary} {' '.join(ep.context_tags)}"
            score = self._calculate_overlap(query, haystack)
            scored_episodes.append((score, ep))
        
        scored_episodes.sort(key=lambda x: x[0], reverse=True)
        return scored_episodes[0][1] if scored_episodes else None

    def insert_episodic(self, record: EpisodicRecord) -> str:
        record_id = f"epi-{len(self._episodic_store) + 1}"
        record.id = record_id
        self._episodic_store.insert(0, record)
        logger.info(f"Persisted new episodic memory to fallback store: {record.conversation_summary}")
        return record_id
