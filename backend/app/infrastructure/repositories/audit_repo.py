from typing import List, Optional, Dict
from datetime import datetime, timezone
from backend.app.domain.models.memory import FullMemorySnapshot
from backend.app.domain.models.diff import TurnMemoryDiff
from backend.app.domain.ports.memory_port import ISnapshotAuditRepository
from backend.app.core.logging import get_logger

logger = get_logger("audit_repo")

class InMemoryAuditRepository(ISnapshotAuditRepository):
    """
    Stores historical snapshots and per-turn memory diffs in memory
    (keyed by session_id and turn_id).
    """
    def __init__(self):
        self._snapshots: Dict[str, Dict[int, FullMemorySnapshot]] = {}
        self._diffs: Dict[str, List[TurnMemoryDiff]] = {}

    def save_snapshot(self, snapshot: FullMemorySnapshot) -> None:
        if snapshot.session_id not in self._snapshots:
            self._snapshots[snapshot.session_id] = {}
        self._snapshots[snapshot.session_id][snapshot.turn_id] = snapshot
        logger.info(f"Saved snapshot for session {snapshot.session_id}, turn {snapshot.turn_id}")

    def get_snapshot(self, session_id: str, turn_id: int) -> Optional[FullMemorySnapshot]:
        return self._snapshots.get(session_id, {}).get(turn_id)

    def save_diff(self, diff: TurnMemoryDiff) -> None:
        if diff.session_id not in self._diffs:
            self._diffs[diff.session_id] = []
        # Update if exists or append
        existing_idx = next((i for i, d in enumerate(self._diffs[diff.session_id]) if d.turn_id == diff.turn_id), None)
        if existing_idx is not None:
            self._diffs[diff.session_id][existing_idx] = diff
        else:
            self._diffs[diff.session_id].append(diff)
        logger.info(f"Recorded memory diff for session {diff.session_id}, turn {diff.turn_id}")

    def get_diffs(self, session_id: str) -> List[TurnMemoryDiff]:
        return self._diffs.get(session_id, [])

    def get_diff(self, session_id: str, turn_id: int) -> Optional[TurnMemoryDiff]:
        diffs = self.get_diffs(session_id)
        for d in diffs:
            if d.turn_id == turn_id:
                return d
        return None
