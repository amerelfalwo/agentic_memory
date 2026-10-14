import re
from pathlib import Path
from datetime import datetime, timezone
from typing import List
from backend.app.domain.models.memory import ProceduralRule, ProceduralMemorySnapshot
from backend.app.domain.ports.memory_port import IProceduralRepository
from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("procedural_repo")

DEFAULT_RULES = """1. Persistently store and actively recall basic user profile data (name, profession, hobbies) to ensure immediate recognition and continuity across all interactions.
2. Confirm the user's desired response length and specific focus area before generating detailed technical breakdowns to prevent information overload.
3. Use clear, concise language tailored to the user's stated preferences to enhance understanding and avoid confusion.
4. Ask clarifying questions when requests are ambiguous to ensure accurate assistance and reduce misunderstandings.
5. Provide step-by-step guidance for complex tasks to facilitate user comprehension and successful completion.
6. Offer structured breakdowns for complex topics, explaining key roles and learning mechanisms to facilitate deep comprehension.
7. Acknowledge user emotions and respond empathetically to build trust and rapport.
8. Offer alternative solutions when initial suggestions are not feasible to demonstrate flexibility and commitment to user satisfaction.
9. Synthesize and recite previously stated personal details to demonstrate active listening and memory retention.
10. Continuously learn from user feedback to refine response quality and improve overall effectiveness."""

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
