import re
from pathlib import Path
from datetime import datetime, timezone
from typing import List
from backend.app.domain.models.memory import ProceduralRule, ProceduralMemorySnapshot
from backend.app.domain.ports.memory_port import IProceduralRepository
from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("procedural_repo")

DEFAULT_RULES = """1. Strict Language & Dialect Mirroring: Always reply in the exact language of the user (English for English queries, Arabic for Arabic queries) and match the dialect naturally (Egyptian Arabic for casual Egyptian expressions, Modern Standard Arabic for general Arabic) without forced regional slang - Guarantees linguistic harmony and prevents confusing language or dialect mismatches.
2. Strictly never use emojis anywhere in the output - Ensures clean, focused, and distraction-free presentation across all turns.
3. Avoid unprompted mentions of underlying architecture or internal memory - Prevents repetitive cognitive architecture lectures and keeps focus entirely on solving the user's request unless explicitly asked.
4. Handle greetings and casual remarks warmly and concisely without capability dumping - Greets the user naturally in 1-2 conversational sentences in their own language without reciting feature lists or mechanical formulas.
5. Provide direct, high-value answers before expanding into structured details - Respects user time by answering the core question first, followed by clear practical context.
6. Adapt tone and depth dynamically based on user style and technical level - Seamlessly transitions from casual friendly chatter to rigorous technical depth when handling engineering tasks.
7. Seamlessly integrate remembered preferences and past context in the background - Leverages episodic recall naturally without explicitly stating that internal memory stores are being queried.
8. Break down complex multi-step technical topics with clear, practical steps - Enhances clarity and actionable execution without unnecessary theoretical jargon.
9. Avoid repetitive boilerplate intros and canned robotic disclaimers - Prevents robotic fatigue and ensures every message starts with fresh, relevant value.
10. Conclude substantive explanations with proactive, relevant follow-up questions - Drives interactive collaboration by inviting the user's input on the next step."""

class FileProceduralRepository(IProceduralRepository):
    def __init__(self, file_path: Path = None):
        self._file_path = file_path or settings.PROCEDURAL_FILE_PATH
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        if not self._file_path.exists():
            self._file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._file_path, "w", encoding="utf-8") as f:
                f.write(DEFAULT_RULES)

    def _parse_rules(self, text: str) -> List[ProceduralRule]:
        rules = []
        lines = [line.strip() for line in text.strip().split("\n") if line.strip()]
        for line in lines:
            match = re.match(r"^(\d+)[\.\)]\s*(.*)", line)
            if match:
                idx = int(match.group(1))
                content = match.group(2).strip()
                # Check if there is instruction - rationale format
                if " - " in content:
                    inst, rat = content.split(" - ", 1)
                    rules.append(ProceduralRule(index=idx, instruction=inst.strip(), rationale=rat.strip()))
                else:
                    rules.append(ProceduralRule(index=idx, instruction=content, rationale=None))
            else:
                rules.append(ProceduralRule(index=len(rules) + 1, instruction=line, rationale=None))
        return rules

    def get_snapshot(self) -> ProceduralMemorySnapshot:
        try:
            with open(self._file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Error reading procedural file: {e}")
            content = DEFAULT_RULES

        rules = self._parse_rules(content)
        return ProceduralMemorySnapshot(
            rules=rules,
            raw_text=content,
            last_updated=datetime.now(timezone.utc)
        )

    def save_rules(self, rules_text: str) -> ProceduralMemorySnapshot:
        with open(self._file_path, "w", encoding="utf-8") as f:
            f.write(rules_text.strip())
        logger.info("Procedural guidelines saved successfully.")
        return self.get_snapshot()
