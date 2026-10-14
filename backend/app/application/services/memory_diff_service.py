from typing import List, Optional
from backend.app.domain.models.memory import (
    FullMemorySnapshot,
    EpisodicRecord,
    SemanticChunk,
    ProceduralRule
)
from backend.app.domain.models.diff import (
    TurnMemoryDiff,
    WorkingMemoryDiff,
    EpisodicMemoryDiff,
    ProceduralMemoryDiff,
    SemanticMemoryDiff,
    RuleDiffItem,
    DiffAction
)
from backend.app.core.logging import get_logger

logger = get_logger("memory_diff_service")

class MemoryDiffService:
    @staticmethod
    def compute_procedural_diff(
        before_rules: List[ProceduralRule],
        after_rules: List[ProceduralRule]
    ) -> ProceduralMemoryDiff:
        diff_items: List[RuleDiffItem] = []
        before_map = {r.index: r for r in before_rules}
        after_map = {r.index: r for r in after_rules}
        all_indices = sorted(set(list(before_map.keys()) + list(after_map.keys())))

        has_changes = False

        for idx in all_indices:
            b_rule = before_map.get(idx)
            a_rule = after_map.get(idx)

            if b_rule and not a_rule:
                has_changes = True
                diff_items.append(
                    RuleDiffItem(
                        index=idx,
                        action=DiffAction.REMOVED,
                        old_instruction=b_rule.instruction,
                        new_instruction=None,
                        rationale=b_rule.rationale
                    )
                )
            elif not b_rule and a_rule:
                has_changes = True
                diff_items.append(
                    RuleDiffItem(
                        index=idx,
                        action=DiffAction.ADDED,
                        old_instruction=None,
                        new_instruction=a_rule.instruction,
                        rationale=a_rule.rationale
                    )
                )
            elif b_rule and a_rule:
                if b_rule.instruction.strip() != a_rule.instruction.strip():
                    has_changes = True
                    diff_items.append(
                        RuleDiffItem(
                            index=idx,
                            action=DiffAction.MODIFIED,
                            old_instruction=b_rule.instruction,
                            new_instruction=a_rule.instruction,
                            rationale=a_rule.rationale or b_rule.rationale
                        )
                    )
                else:
                    diff_items.append(
                        RuleDiffItem(
                            index=idx,
                            action=DiffAction.UNCHANGED,
                            old_instruction=b_rule.instruction,
                            new_instruction=a_rule.instruction,
                            rationale=a_rule.rationale
                        )
                    )

        return ProceduralMemoryDiff(
            changed=has_changes,
            rule_diffs=diff_items,
            rules_before_count=len(before_rules),
            rules_after_count=len(after_rules)
        )

    @classmethod
    def compute_turn_diff(
        cls,
        session_id: str,
        turn_id: int,
        before_snap: FullMemorySnapshot,
        after_snap: FullMemorySnapshot,
        query: str,
        retrieved_semantic: List[SemanticChunk],
        matched_episodic: Optional[EpisodicRecord] = None,
        new_reflection: Optional[EpisodicRecord] = None,
        added_messages: Optional[List[dict]] = None
    ) -> TurnMemoryDiff:
        # Working memory diff
        msg_delta = after_snap.working.message_count - before_snap.working.message_count
        summary_triggered = after_snap.working.is_summarized and not before_snap.working.is_summarized
        token_delta = after_snap.working.estimated_tokens - before_snap.working.estimated_tokens

        working_diff = WorkingMemoryDiff(
            messages_before=before_snap.working.message_count,
            messages_after=after_snap.working.message_count,
            delta_messages=msg_delta,
            summary_triggered=summary_triggered,
            new_summary=after_snap.working.active_summary,
            estimated_tokens_delta=token_delta,
            added_messages=added_messages or []
        )

        # Episodic diff
        episodic_diff = EpisodicMemoryDiff(
            matched_prior_episode=matched_episodic or before_snap.episodic,
            new_reflection_created=new_reflection is not None,
            new_reflection=new_reflection,
            persisted_to_vdb=new_reflection is not None
        )

        # Procedural diff
        procedural_diff = cls.compute_procedural_diff(
            before_snap.procedural.rules,
            after_snap.procedural.rules
        )

        # Semantic diff
        semantic_diff = SemanticMemoryDiff(
            search_query=query,
            retrieved_chunks_count=len(retrieved_semantic),
            retrieved_chunks=retrieved_semantic
        )

        diff = TurnMemoryDiff(
            session_id=session_id,
            turn_id=turn_id,
            working_diff=working_diff,
            episodic_diff=episodic_diff,
            procedural_diff=procedural_diff,
            semantic_diff=semantic_diff
        )
        logger.info(f"Computed comprehensive memory diff for turn {turn_id}")
        return diff
