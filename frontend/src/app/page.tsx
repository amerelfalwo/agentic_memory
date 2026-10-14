'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { MemoryGraph } from '../components/MemoryGraph';
import { ChatPanel } from '../components/ChatPanel';
import { MemoryDiffInspector } from '../components/MemoryDiffInspector';
import { ProceduralEditor } from '../components/ProceduralEditor';
import {
  fetchHealth,
  fetchTopology,
  fetchSessionDiffs,
  resetSession,
  sendChatMessage
} from '../lib/api';
import {
  MemoryTopologyResponse,
  TurnMemoryDiff,
  ChatMessage
} from '../types';
import { LayoutDashboard, ScrollText, Network, Sparkles } from 'lucide-react';

export default function Home() {
  const [sessionId] = useState<string>('session-main');
  const [vectorDbConnected, setVectorDbConnected] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>('ChatGroq (Qwen)');
  const [turnCount, setTurnCount] = useState<number>(0);
  const [topology, setTopology] = useState<MemoryTopologyResponse | null>(null);
  const [diffs, setDiffs] = useState<TurnMemoryDiff[]>([]);
  const [selectedTurnId, setSelectedTurnId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'guidelines'>('dashboard');

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const health = await fetchHealth();
      setVectorDbConnected(health.vector_db_connected);
      setModelName(health.model);

      const topo = await fetchTopology(sessionId);
      setTopology(topo);
      setTurnCount(topo.turn_id);

      const sessionDiffs = await fetchSessionDiffs(sessionId);
      setDiffs(sessionDiffs);
      if (sessionDiffs.length > 0) {
        setSelectedTurnId(sessionDiffs[sessionDiffs.length - 1].turn_id);
      }
    } catch (err) {
      console.error('Initialization error:', err);
    }
  };

  const handleSendMessage = async (userPrompt: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent('');
    setStatusText('Evaluating prompt security guardrail...');

    try {
      const result = await sendChatMessage(
        sessionId,
        userPrompt,
        (token) => {
          setStreamingContent((prev) => prev + token);
        },
        (status) => {
          setStatusText(status);
        },
        (turnDiff) => {
          setDiffs((prev) => {
            const exists = prev.find((d) => d.turn_id === turnDiff.turn_id);
            if (exists) return prev.map((d) => (d.turn_id === turnDiff.turn_id ? turnDiff : d));
            return [...prev, turnDiff];
          });
          setSelectedTurnId(turnDiff.turn_id);
        }
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString(),
        turnId: result.turn_id,
        securityBlocked: result.security_blocked,
        blockedReason: result.blocked_reason,
        diff: result.diff
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setTurnCount(result.turn_id);

      // Refresh topology after turn completes
      const updatedTopology = await fetchTopology(sessionId);
      setTopology(updatedTopology);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error communicating with agent engine: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setStatusText('');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset the conversation state and active memories?')) {
      try {
        await resetSession(sessionId);
        setMessages([]);
        setDiffs([]);
        setSelectedTurnId(null);
        setTurnCount(0);
        const updatedTopology = await fetchTopology(sessionId);
        setTopology(updatedTopology);
      } catch (err) {
        alert('Failed to reset session.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <Header
        vectorDbConnected={vectorDbConnected}
        modelName={modelName}
        turnCount={turnCount}
        onReset={handleReset}
        isStreaming={isStreaming}
        statusText={statusText}
      />

      {/* View Switcher Bar */}
      <div className="bg-slate-900/50 border-b border-slate-800/80 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-400" />
              <span>Cognitive Mesh & Chat Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('guidelines')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'guidelines'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ScrollText className="w-4 h-4 text-emerald-400" />
              <span>Procedural Guidelines Manager</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Turn-by-turn memory deltas are automatically recorded and analyzed</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {activeTab === 'dashboard' ? (
          <>
            {/* Top Grid: Graph (Left) & Chat (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Memory Connections Graph */}
              <div className="lg:col-span-7">
                <MemoryGraph
                  topology={topology}
                  isStreaming={isStreaming}
                />
              </div>

              {/* Chat Panel */}
              <div className="lg:col-span-5">
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isStreaming={isStreaming}
                  streamingContent={streamingContent}
                  onSelectTurnDiff={(tId) => setSelectedTurnId(tId)}
                />
              </div>
            </div>

            {/* Bottom Full-Width Section: Granular Turn-by-Turn Memory Diff Inspector */}
            <div>
              <MemoryDiffInspector
                diffs={diffs}
                selectedTurnId={selectedTurnId}
                onSelectTurn={(tId) => setSelectedTurnId(tId)}
              />
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto h-[650px]">
            <ProceduralEditor />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-4 px-6 text-center text-xs text-slate-500">
        Agentic Memory Engine • Built with FastAPI, Next.js, LangGraph & CoALA Framework
      </footer>
    </div>
  );
}
