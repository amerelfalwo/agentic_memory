from abc import ABC, abstractmethod
from typing import List, Optional
from backend.app.domain.models.memory import ProceduralRule, ProceduralMemorySnapshot, FullMemorySnapshot
from backend.app.domain.models.diff import TurnMemoryDiff

class IProceduralRepository(ABC):
    @abstractmethod
    def get_snapshot(self) -> ProceduralMemorySnapshot:
        """Returns the current active procedural rules."""
        pass

    @abstractmethod
    def save_rules(self, rules_text: str) -> ProceduralMemorySnapshot:
        """Overwrites and saves procedural rules."""
        pass

class ISnapshotAuditRepository(ABC):
    @abstractmethod
    def save_snapshot(self, snapshot: FullMemorySnapshot) -> None:
        """Saves a turn snapshot."""
        pass

    @abstractmethod
    def get_snapshot(self, session_id: str, turn_id: int) -> Optional[FullMemorySnapshot]:
        """Gets a turn snapshot."""
        pass

    @abstractmethod
    def save_diff(self, diff: TurnMemoryDiff) -> None:
        """Saves a computed turn memory diff."""
        pass

    @abstractmethod
    def get_diffs(self, session_id: str) -> List[TurnMemoryDiff]:
        """Returns all recorded memory diffs for a session."""
        pass

    @abstractmethod
    def get_diff(self, session_id: str, turn_id: int) -> Optional[TurnMemoryDiff]:
        """Returns memory diff for a specific turn."""
        pass
