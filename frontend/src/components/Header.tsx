'use client';

import React from 'react';
import { Cpu, ShieldCheck, Database, RotateCcw, Activity } from 'lucide-react';

interface HeaderProps {
  vectorDbConnected: boolean;
  modelName: string;
  turnCount: number;
  onReset: () => void;
  isStreaming: boolean;
  statusText?: string;
}

export const Header: React.FC<HeaderProps> = ({
  vectorDbConnected,
  modelName,
  turnCount,
  onReset,
  isStreaming,
  statusText
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                Agentic Memory AI Engine
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                CoALA Framework
              </span>
            </div>
            <p className="text-xs text-slate-400">
              LangGraph Multi-Tier Cognitive Architecture • Working • Episodic • Semantic • Procedural
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center space-x-3">
          {/* Status Message */}
          {statusText && (
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-cyan-400">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>{statusText}</span>
            </div>
          )}

          {/* Model Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span className="font-medium text-slate-400">LLM:</span>
            <span className="font-semibold text-purple-300">{modelName || 'ChatGroq (Qwen)'}</span>
          </div>

          {/* Vector DB Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-400">Vector DB:</span>
            <span className={`font-semibold ${vectorDbConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {vectorDbConnected ? 'Weaviate' : 'Fallback (In-Memory)'}
            </span>
          </div>

          {/* Security Guardrail */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Guardrail Armed</span>
          </div>

          {/* Turn Counter */}
          <div className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300">
            <span className="font-medium text-slate-400">Turn:</span>
            <span className="font-bold text-indigo-300">{turnCount}</span>
          </div>

          {/* Reset Session Button */}
          <button
            onClick={onReset}
            disabled={isStreaming}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-xs font-medium text-rose-300 transition-colors disabled:opacity-50"
            title="Reset conversation state and memory history"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Session</span>
          </button>
        </div>
      </div>
    </header>
  );
};
