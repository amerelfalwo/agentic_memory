'use client';

import React, { useState } from 'react';
import {
  Zap,
  BookOpen,
  Library,
  ScrollText,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Check,
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';
import { TurnMemoryDiff, RuleDiffItem } from '../types';

interface MemoryDiffInspectorProps {
  diffs: TurnMemoryDiff[];
  selectedTurnId: number | null;
  onSelectTurn: (turnId: number) => void;
}

export const MemoryDiffInspector: React.FC<MemoryDiffInspectorProps> = ({
  diffs,
  selectedTurnId,
  onSelectTurn
}) => {
  const [activeTab, setActiveTab] = useState<'working' | 'episodic' | 'procedural' | 'semantic'>('working');

  // If no turn is selected, default to the latest recorded turn
  const currentDiff = diffs.find((d) => d.turn_id === selectedTurnId) || diffs[diffs.length - 1];

  if (!diffs || diffs.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400">
        <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-200">No Memory Diffs Recorded Yet</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Send a prompt to the agent. As multi-turn dialogue expands, turn-by-turn memory deltas will appear here in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
      {/* Header and Turn Selector Timeline */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">
              Turn-by-Turn Memory Evolution Inspector
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Observing granular memory state mutations as conversation history expands
          </p>
        </div>

        {/* Turn Selector Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          {diffs.map((d) => {
            const isSelected = currentDiff && currentDiff.turn_id === d.turn_id;
            return (
              <button
                key={d.turn_id}
                onClick={() => onSelectTurn(d.turn_id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Turn {d.turn_id}</span>
                {d.working_diff.summary_triggered && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Summarization Event" />
                )}
                {d.procedural_diff.changed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Rules Evolved" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Memory Subsystem Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 gap-4">
        <button
          onClick={() => setActiveTab('working')}
          className={`py-3 text-xs font-bold transition-all relative flex items-center space-x-2 ${
            activeTab === 'working' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>⚡ Working Memory</span>
          {currentDiff?.working_diff.summary_triggered && (
            <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
              Summarized
            </span>
          )}
          {activeTab === 'working' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('episodic')}
          className={`py-3 text-xs font-bold transition-all relative flex items-center space-x-2 ${
            activeTab === 'episodic' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>📖 Episodic Memory</span>
          {currentDiff?.episodic_diff.new_reflection_created && (
            <span className="px-1.5 py-0.5 text-[9px] bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
              New Reflection
            </span>
          )}
          {activeTab === 'episodic' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('procedural')}
          className={`py-3 text-xs font-bold transition-all relative flex items-center space-x-2 ${
            activeTab === 'procedural' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          <span>📋 Procedural Guidelines</span>
          {currentDiff?.procedural_diff.changed && (
            <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
              Updated
            </span>
          )}
          {activeTab === 'procedural' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('semantic')}
          className={`py-3 text-xs font-bold transition-all relative flex items-center space-x-2 ${
            activeTab === 'semantic' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Library className="w-4 h-4" />
          <span>📚 Semantic Retrieval</span>
          <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
            {currentDiff?.semantic_diff.retrieved_chunks_count || 0} chunks
          </span>
          {activeTab === 'semantic' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-5 flex-1 min-h-[280px] overflow-y-auto">
        {/* WORKING MEMORY PANEL */}
        {activeTab === 'working' && currentDiff && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 font-medium">Message Buffer Delta</span>
                <div className="text-lg font-bold text-amber-300 mt-1 flex items-center space-x-2">
                  <span>{currentDiff.working_diff.messages_before}</span>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                  <span>{currentDiff.working_diff.messages_after}</span>
                  <span className="text-xs font-normal text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                    +{currentDiff.working_diff.delta_messages}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 font-medium">Estimated Tokens Delta</span>
                <div className="text-lg font-bold text-amber-300 mt-1">
                  +{currentDiff.working_diff.estimated_tokens_delta} tokens
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-500 font-medium">Summarization Status</span>
                <div className="text-sm font-semibold mt-1">
                  {currentDiff.working_diff.summary_triggered ? (
                    <span className="text-amber-400 flex items-center space-x-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>History Compressed</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Within Threshold (Sliding Window)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Summarization Details if Triggered */}
            {currentDiff.working_diff.new_summary && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs">
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Active Conversation Summary (Working Memory Condensation):</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-mono">
                  {currentDiff.working_diff.new_summary}
                </p>
              </div>
            )}

            {/* Messages Appended in this Turn */}
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Messages Appended in Turn {currentDiff.turn_id}:
              </span>
              <div className="space-y-2">
                {currentDiff.working_diff.added_messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs border ${
                      m.role === 'user'
                        ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="font-bold uppercase tracking-wider text-[10px] block text-slate-400 mb-1">
                      {m.role}:
                    </span>
                    <p className="line-clamp-3">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EPISODIC MEMORY PANEL */}
        {activeTab === 'episodic' && currentDiff && (
          <div className="space-y-4">
            {/* Matched Prior Episode */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-2">
                1. Matched Prior Experience (Retrieved from Episodic Collection):
              </span>
              {currentDiff.episodic_diff.matched_prior_episode ? (
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-slate-500 font-semibold block mb-0.5">Matched Case:</span>
                    <p className="italic font-mono text-[11px] text-purple-200">
                      {currentDiff.episodic_diff.matched_prior_episode.conversation}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-emerald-200">
                      <span className="font-bold text-emerald-400 block mb-0.5">What Worked:</span>
                      {currentDiff.episodic_diff.matched_prior_episode.what_worked}
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/30 text-rose-200">
                      <span className="font-bold text-rose-400 block mb-0.5">What to Avoid:</span>
                      {currentDiff.episodic_diff.matched_prior_episode.what_to_avoid}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No prior similar interaction recalled.</p>
              )}
            </div>

            {/* Newly Created Reflection */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-2">
                2. New Reflection Formed in Turn {currentDiff.turn_id}:
              </span>
              {currentDiff.episodic_diff.new_reflection ? (
                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {currentDiff.episodic_diff.new_reflection.context_tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-300 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 font-medium">
                      ✓ Persisted to Vector Storage
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-slate-500 font-semibold block mb-0.5">Summary of Turn:</span>
                    {currentDiff.episodic_diff.new_reflection.conversation_summary}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-emerald-200">
                      <span className="font-bold text-emerald-400 block mb-0.5">Takeaway (What Worked):</span>
                      {currentDiff.episodic_diff.new_reflection.what_worked}
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/30 text-rose-200">
                      <span className="font-bold text-rose-400 block mb-0.5">Takeaway (What to Avoid):</span>
                      {currentDiff.episodic_diff.new_reflection.what_to_avoid}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Dialogue reflection is triggered every 2 turns or at session milestones.
                </p>
              )}
            </div>
          </div>
        )}

        {/* PROCEDURAL MEMORY PANEL */}
        {activeTab === 'procedural' && currentDiff && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">
                Rule Delta Status: {currentDiff.procedural_diff.changed ? (
                  <span className="text-emerald-400 font-bold ml-1">Updated via Reflection</span>
                ) : (
                  <span className="text-slate-400 font-normal ml-1">No modifications (stable)</span>
                )}
              </span>
              <span className="text-xs text-slate-500">
                {currentDiff.procedural_diff.rules_after_count} active guidelines
              </span>
            </div>

            <div className="space-y-2">
              {currentDiff.procedural_diff.rule_diffs.map((r: RuleDiffItem) => {
                let badgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
                let actionLabel = 'UNCHANGED';
                if (r.action === 'added') {
                  badgeClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
                  actionLabel = 'ADDED';
                } else if (r.action === 'modified') {
                  badgeClass = 'bg-amber-950/80 text-amber-300 border-amber-700';
                  actionLabel = 'MODIFIED';
                } else if (r.action === 'removed') {
                  badgeClass = 'bg-rose-950/80 text-rose-300 border-rose-700';
                  actionLabel = 'REMOVED';
                }

                return (
                  <div
                    key={r.index}
                    className={`p-3 rounded-xl border text-xs transition-colors ${
                      r.action === 'modified'
                        ? 'bg-amber-950/20 border-amber-800/40'
                        : r.action === 'added'
                        ? 'bg-emerald-950/20 border-emerald-800/40'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-200">Rule #{r.index}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${badgeClass}`}>
                        {actionLabel}
                      </span>
                    </div>

                    {r.action === 'modified' && r.old_instruction && (
                      <div className="mb-2 p-2 rounded-lg bg-rose-950/30 text-rose-300 line-through text-[11px]">
                        {r.old_instruction}
                      </div>
                    )}

                    <div className="text-slate-300 font-medium leading-relaxed">
                      {r.new_instruction || r.old_instruction}
                    </div>

                    {r.rationale && (
                      <div className="mt-1.5 text-[11px] text-slate-500 italic">
                        Rationale: {r.rationale}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SEMANTIC MEMORY PANEL */}
        {activeTab === 'semantic' && currentDiff && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Query Used for Hybrid Search:</span>
                <span className="ml-2 font-mono text-cyan-300 font-semibold">
                  "{currentDiff.semantic_diff.search_query}"
                </span>
              </div>
              <div className="text-slate-400">
                Source: <span className="text-slate-200 font-semibold">CoALA_Paper.pdf</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {currentDiff.semantic_diff.retrieved_chunks.map((chunk, i) => (
                <div
                  key={chunk.id || i}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-cyan-400 flex items-center space-x-1.5">
                      <Library className="w-3.5 h-3.5" />
                      <span>Chunk #{chunk.chunk_index}</span>
                    </span>
                    {chunk.score && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 text-[10px] font-mono">
                        Score: {chunk.score}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 font-sans leading-relaxed">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
