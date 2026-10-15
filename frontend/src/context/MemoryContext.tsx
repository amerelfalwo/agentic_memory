'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

export interface ChatSessionMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
}

interface MemoryContextType {
  sessionId: string;
  sessions: ChatSessionMeta[];
  messages: ChatMessage[];
  diffs: TurnMemoryDiff[];
  topology: MemoryTopologyResponse | null;
  selectedTurnId: number | null;
  vectorDbConnected: boolean;
  modelName: string;
  isStreaming: boolean;
  streamingContent: string;
  statusText: string;
  setSelectedTurnId: (turnId: number | null) => void;
  handleSendMessage: (prompt: string) => Promise<void>;
  handleResetSession: () => Promise<void>;
  handleCreateNewSession: () => void;
  handleSelectSession: (id: string) => void;
  refreshTopology: () => Promise<void>;
  refreshDiffs: () => Promise<void>;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

export const MemoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string>('session-main');
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([
    {
      id: 'session-main',
      title: 'Current Investigation',
      createdAt: '2026-10-15T00:00:00.000Z',
      updatedAt: '2026-10-15T00:00:00.000Z',
      turnCount: 0
    }
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [diffs, setDiffs] = useState<TurnMemoryDiff[]>([]);
  const [selectedTurnId, setSelectedTurnId] = useState<number | null>(null);
  const [topology, setTopology] = useState<MemoryTopologyResponse | null>(null);
  const [vectorDbConnected, setVectorDbConnected] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>('ChatGroq (Qwen)');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const health = await fetchHealth();
        setVectorDbConnected(health.vector_db_connected);
        if (health.model) setModelName(health.model);

        const topo = await fetchTopology(sessionId);
        setTopology(topo);

        const sessionDiffs = await fetchSessionDiffs(sessionId);
        setDiffs(sessionDiffs);
        if (sessionDiffs.length > 0) {
          setSelectedTurnId(sessionDiffs[sessionDiffs.length - 1].turn_id);
        }
      } catch (err) {
        console.error('MemoryContext initialization error:', err);
      }
    };
    init();
  }, [sessionId]);

  const refreshTopology = useCallback(async () => {
    try {
      const topo = await fetchTopology(sessionId);
      setTopology(topo);
    } catch (err) {
      console.error('Failed to refresh topology:', err);
    }
  }, [sessionId]);

  const refreshDiffs = useCallback(async () => {
    try {
      const sessionDiffs = await fetchSessionDiffs(sessionId);
      setDiffs(sessionDiffs);
    } catch (err) {
      console.error('Failed to refresh diffs:', err);
    }
  }, [sessionId]);

  const handleSendMessage = async (userPrompt: string) => {
    if (!userPrompt.trim() || isStreaming) return;

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

    // Update session title if first message
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId && s.title === 'Current Investigation'
          ? { ...s, title: userPrompt.slice(0, 32) + (userPrompt.length > 32 ? '...' : '') }
          : s
      )
    );

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

      // Update session turn count
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, turnCount: result.turn_id, updatedAt: new Date().toISOString() } : s))
      );

      // Refresh graph topology after turn
      await refreshTopology();
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error communicating with agent: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setStatusText('');
    }
  };

  const handleResetSession = async () => {
    try {
      await resetSession(sessionId);
      setMessages([]);
      setDiffs([]);
      setSelectedTurnId(null);
      await refreshTopology();
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, turnCount: 0, title: 'Current Investigation' } : s))
      );
    } catch (err) {
      console.error('Failed to reset session:', err);
    }
  };

  const handleCreateNewSession = () => {
    const newId = `session-${Date.now().toString(36)}`;
    const newSessionMeta: ChatSessionMeta = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      turnCount: 0
    };
    setSessions((prev) => [newSessionMeta, ...prev]);
    setSessionId(newId);
    setMessages([]);
    setDiffs([]);
    setSelectedTurnId(null);
  };

  const handleSelectSession = (id: string) => {
    if (id === sessionId) return;
    setSessionId(id);
    setMessages([]);
    setDiffs([]);
    setSelectedTurnId(null);
  };

  return (
    <MemoryContext.Provider
      value={{
        sessionId,
        sessions,
        messages,
        diffs,
        topology,
        selectedTurnId,
        vectorDbConnected,
        modelName,
        isStreaming,
        streamingContent,
        statusText,
        setSelectedTurnId,
        handleSendMessage,
        handleResetSession,
        handleCreateNewSession,
        handleSelectSession,
        refreshTopology,
        refreshDiffs
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
};

export const useMemory = () => {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemory must be used within a MemoryProvider');
  }
  return context;
};
