'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Zap, BookOpen, Library, ScrollText, CheckCircle2 } from 'lucide-react';
import { TurnMemoryDiff } from '../../types';

interface MemoryActivityAccordionProps {
  diff?: TurnMemoryDiff;
  turnId?: number;
}

export const MemoryActivityAccordion: React.FC<MemoryActivityAccordionProps> = ({ diff, turnId }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!diff) return null;

  const hasEpisodic = diff.episodic_diff.matched_prior_episode || diff.episodic_diff.new_reflection;
  const hasSemantic = diff.semantic_diff.retrieved_chunks_count > 0;
  const hasProcedural = diff.procedural_diff.changed;
  const hasSummary = diff.working_diff.summary_triggered;

  return (
    <div className="mt-2.5 pt-2 border-t border-[#DFE5DD]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 text-xs text-[#737B74] hover:text-[#0F766E] font-medium transition-colors cursor-pointer"
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>Memory Activity (Turn #{turnId || diff.turn_id})</span>
        <div className="flex items-center space-x-1 ml-2">
          {hasSemantic && (
            <span className="px-1.5 py-0.2 rounded bg-[#E6F7F5] text-[#0F766E] text-[10px]">
              {diff.semantic_diff.retrieved_chunks_count} Semantic Chunks
            </span>
          )}
          {diff.episodic_diff.matched_prior_episode && (
            <span className="px-1.5 py-0.2 rounded bg-[#E6F7F5] text-[#0F766E] text-[10px]">
              Episodic Match
            </span>
          )}
          {hasProcedural && (
            <span className="px-1.5 py-0.2 rounded bg-[#E6F7F5] text-[#0F766E] text-[10px]">
              Guidelines Evolved
            </span>
          )}
          {hasSummary && (
            <span className="px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#B7791F] text-[10px]">
              History Summarized
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="mt-2.5 space-y-2 pl-4 border-l-2 border-[#DFE5DD] text-xs text-[#242A25]">
          {/* Working Memory */}
          <div className="bg-[#F6F6F0] p-2.5 rounded-md border border-[#DFE5DD]">
            <div className="flex items-center space-x-1.5 font-medium text-[#0F766E] mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Working Memory</span>
            </div>
            <p className="text-[11px] text-[#737B74]">
              Added {diff.working_diff.delta_messages} messages • Context tokens: ~{diff.working_diff.estimated_tokens_delta} delta.
              {diff.working_diff.summary_triggered && ' Previous turns were condensed into active summary.'}
            </p>
            {diff.working_diff.new_summary && (
              <p className="mt-1 font-mono text-[10px] text-[#242A25] bg-white p-1.5 rounded border border-[#DFE5DD]">
                {diff.working_diff.new_summary}
              </p>
            )}
          </div>

          {/* Episodic Memory */}
          {hasEpisodic && (
            <div className="bg-[#F6F6F0] p-2.5 rounded-md border border-[#DFE5DD]">
              <div className="flex items-center space-x-1.5 font-medium text-[#0F766E] mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Episodic Memory Recall & Reflection</span>
              </div>
              {diff.episodic_diff.matched_prior_episode && (
                <div className="text-[11px] text-[#737B74] mb-1">
                  <span className="font-semibold text-[#242A25]">Matched Prior Case: </span>
                  {diff.episodic_diff.matched_prior_episode.conversation_summary}
                  <div className="mt-0.5 text-[10px] text-[#0F766E]">
                    What worked: {diff.episodic_diff.matched_prior_episode.what_worked}
                  </div>
                </div>
              )}
              {diff.episodic_diff.new_reflection && (
                <div className="mt-1 pt-1 border-t border-[#DFE5DD] text-[11px]">
                  <span className="font-semibold text-[#0F766E]">Formed Reflection: </span>
                  {diff.episodic_diff.new_reflection.conversation_summary}
                </div>
              )}
            </div>
          )}

          {/* Semantic Memory */}
          {hasSemantic && (
            <div className="bg-[#F6F6F0] p-2.5 rounded-md border border-[#DFE5DD]">
              <div className="flex items-center space-x-1.5 font-medium text-[#0F766E] mb-1">
                <Library className="w-3.5 h-3.5" />
                <span>Semantic Knowledge Retrieval (CoALA Paper)</span>
              </div>
              <p className="text-[11px] text-[#737B74] mb-1">
                Query: <span className="font-mono text-[#242A25]">"{diff.semantic_diff.search_query}"</span>
              </p>
              <div className="space-y-1">
                {diff.semantic_diff.retrieved_chunks.slice(0, 2).map((chunk, i) => (
                  <div key={i} className="text-[11px] bg-white p-1.5 rounded border border-[#DFE5DD]">
                    <span className="font-mono text-[10px] text-[#0F766E]">Chunk #{chunk.chunk_index} (Score: {chunk.score || 'N/A'}): </span>
                    <span className="text-[#242A25] line-clamp-2">{chunk.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Procedural Memory */}
          <div className="bg-[#F6F6F0] p-2.5 rounded-md border border-[#DFE5DD]">
            <div className="flex items-center space-x-1.5 font-medium text-[#0F766E] mb-1">
              <ScrollText className="w-3.5 h-3.5" />
              <span>Procedural Guidelines</span>
            </div>
            <p className="text-[11px] text-[#737B74]">
              {diff.procedural_diff.changed
                ? 'Guidelines were updated following turn reflection.'
                : `${diff.procedural_diff.rules_after_count} active behavioral guidelines maintained.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
