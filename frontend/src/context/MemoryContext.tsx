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
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  setSelectedTurnId: (turnId: number | null) => void;
  handleSendMessage: (prompt: string) => Promise<void>;
  handleResetSession: () => Promise<void>;
  handleCreateNewSession: () => void;
  handleSelectSession: (id: string) => void;
  handleDeleteSession: (id: string) => void;
  refreshTopology: () => Promise<void>;
  refreshDiffs: () => Promise<void>;
}

const MNEMOS_SESSIONS_KEY = 'mnemos_sessions_v3';
const MNEMOS_ACTIVE_SESSION_KEY = 'mnemos_active_session_id_v3';
const MNEMOS_MSGS_PREFIX = 'mnemos_msgs_';
const MNEMOS_DIFFS_PREFIX = 'mnemos_diffs_';
const MNEMOS_SIDEBAR_COLLAPSED_KEY = 'mnemos_sidebar_collapsed_v3';

const getStored = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStored = (key: string, val: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, val);
  } catch {}
};

const removeStored = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {}
};

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  // Client hydration from localStorage
  useEffect(() => {
    // Read sidebar state
    const savedCollapsed = getStored(MNEMOS_SIDEBAR_COLLAPSED_KEY);
    if (savedCollapsed !== null) {
      setSidebarCollapsed(savedCollapsed === 'true');
    }

    // Read sessions
    const savedSessionsRaw = getStored(MNEMOS_SESSIONS_KEY);
    let currentSessions: ChatSessionMeta[] = [];
    if (savedSessionsRaw) {
      try {
        const parsed = JSON.parse(savedSessionsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentSessions = parsed;
        }
      } catch (e) {
        console.error('Error parsing stored sessions:', e);
      }
    }

    let activeId = 'session-main';
    if (currentSessions.length > 0) {
      const savedActiveId = getStored(MNEMOS_ACTIVE_SESSION_KEY);
      if (savedActiveId && currentSessions.some((s) => s.id === savedActiveId)) {
        activeId = savedActiveId;
      } else {
        activeId = currentSessions[0].id;
      }
      setSessions(currentSessions);
      setSessionId(activeId);
    } else {
      const initialId = `session-${Date.now().toString(36)}`;
      const initialSession: ChatSessionMeta = {
        id: initialId,
        title: 'New Conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        turnCount: 0
      };
      currentSessions = [initialSession];
      activeId = initialId;
      setSessions(currentSessions);
      setSessionId(initialId);
      setStored(MNEMOS_SESSIONS_KEY, JSON.stringify(currentSessions));
      setStored(MNEMOS_ACTIVE_SESSION_KEY, initialId);
    }

    // Load messages for active session
    const savedMsgsRaw = getStored(MNEMOS_MSGS_PREFIX + activeId);
    if (savedMsgsRaw) {
      try {
        setMessages(JSON.parse(savedMsgsRaw));
      } catch (e) {
        console.error('Error loading saved messages:', e);
      }
    }

    // Load diffs for active session
    const savedDiffsRaw = getStored(MNEMOS_DIFFS_PREFIX + activeId);
    if (savedDiffsRaw) {
      try {
        const parsedDiffs = JSON.parse(savedDiffsRaw);
        setDiffs(parsedDiffs);
        if (parsedDiffs.length > 0) {
          setSelectedTurnId(parsedDiffs[parsedDiffs.length - 1].turn_id);
        }
      } catch (e) {
        console.error('Error loading saved diffs:', e);
      }
    }

    setHasHydrated(true);
  }, []);

  // Save sidebar collapsed state
  useEffect(() => {
    if (hasHydrated) {
      setStored(MNEMOS_SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    }
  }, [sidebarCollapsed, hasHydrated]);

  // Initial backend health and topology sync
  useEffect(() => {
    if (!hasHydrated) return;

    const syncBackend = async () => {
      try {
        const health = await fetchHealth();
        setVectorDbConnected(health.vector_db_connected);
        if (health.model) setModelName(health.model);

        const topo = await fetchTopology(sessionId);
        setTopology(topo);

        const remoteDiffs = await fetchSessionDiffs(sessionId);
        if (remoteDiffs && remoteDiffs.length > 0) {
          setDiffs(remoteDiffs);
          setStored(MNEMOS_DIFFS_PREFIX + sessionId, JSON.stringify(remoteDiffs));
          setSelectedTurnId(remoteDiffs[remoteDiffs.length - 1].turn_id);
        }
      } catch (err) {
        console.error('Backend sync error:', err);
      }
    };
    syncBackend();
  }, [sessionId, hasHydrated]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

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
      setStored(MNEMOS_DIFFS_PREFIX + sessionId, JSON.stringify(sessionDiffs));
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

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setStored(MNEMOS_MSGS_PREFIX + sessionId, JSON.stringify(newMessages));

    setIsStreaming(true);
    setStreamingContent('');
    setStatusText('Evaluating prompt security guardrail...');

    // Auto-title session on first user turn
    const autoTitle = userPrompt.trim().slice(0, 32) + (userPrompt.trim().length > 32 ? '...' : '');
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId && (s.title === 'New Conversation' || s.title === 'Current Investigation')
          ? { ...s, title: autoTitle, updatedAt: new Date().toISOString() }
          : s
      );
      setStored(MNEMOS_SESSIONS_KEY, JSON.stringify(updated));
      return updated;
    });

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
            const updated = exists
              ? prev.map((d) => (d.turn_id === turnDiff.turn_id ? turnDiff : d))
              : [...prev, turnDiff];
            setStored(MNEMOS_DIFFS_PREFIX + sessionId, JSON.stringify(updated));
            return updated;
          });
          setSelectedTurnId(turnDiff.turn_id);
        }
      );

      const contentToDisplay =
        result.response ||
        (result.diff?.working_diff?.added_messages?.find((m: any) => m.role === 'assistant')?.content) ||
        '';

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: contentToDisplay,
        timestamp: new Date().toISOString(),
        turnId: result.turn_id,
        securityBlocked: result.security_blocked,
        blockedReason: result.blocked_reason,
        diff: result.diff
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      setStored(MNEMOS_MSGS_PREFIX + sessionId, JSON.stringify(finalMessages));

      // Update session turn count and timestamp
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId
            ? { ...s, turnCount: result.turn_id, updatedAt: new Date().toISOString() }
            : s
        );
        setStored(MNEMOS_SESSIONS_KEY, JSON.stringify(updated));
        return updated;
      });

      // Refresh graph topology
      await refreshTopology();
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error communicating with agent: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      const errorMessages = [...newMessages, errorMessage];
      setMessages(errorMessages);
      setStored(MNEMOS_MSGS_PREFIX + sessionId, JSON.stringify(errorMessages));
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
      setStored(MNEMOS_MSGS_PREFIX + sessionId, JSON.stringify([]));
      setStored(MNEMOS_DIFFS_PREFIX + sessionId, JSON.stringify([]));

      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId ? { ...s, turnCount: 0, title: 'New Conversation' } : s
        );
        setStored(MNEMOS_SESSIONS_KEY, JSON.stringify(updated));
        return updated;
      });

      await refreshTopology();
    } catch (err) {
      console.error('Failed to reset session:', err);
    }
  };

  const handleCreateNewSession = () => {
    const newId = `session-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newSessionMeta: ChatSessionMeta = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      turnCount: 0
    };

    const nextSessions = [newSessionMeta, ...sessions];
    setSessions(nextSessions);
    setSessionId(newId);
    setMessages([]);
    setDiffs([]);
    setSelectedTurnId(null);

    setStored(MNEMOS_SESSIONS_KEY, JSON.stringify(nextSessions));
    setStored(MNEMOS_ACTIVE_SESSION_KEY, newId);
    setStored(MNEMOS_MSGS_PREFIX + newId, JSON.stringify([]));
    setStored(MNEMOS_DIFFS_PREFIX + newId, JSON.stringify([]));
  };

  const handleSelectSession = (id: string) => {
    if (id === sessionId) return;

    setSessionId(id);
    setStored(MNEMOS_ACTIVE_SESSION_KEY, id);

    // Load target session's messages
    const rawMsgs = getStored(MNEMOS_MSGS_PREFIX + id);
    if (rawMsgs) {
      try {
        setMessages(JSON.parse(rawMsgs));
      } catch (e) {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }

    // Load target session's diffs
    const rawDiffs = getStored(MNEMOS_DIFFS_PREFIX + id);
    if (rawDiffs) {
      try {
        const parsedDiffs = JSON.parse(rawDiffs);
        setDiffs(parsedDiffs);
        if (parsedDiffs.length > 0) {
          setSelectedTurnId(parsedDiffs[parsedDiffs.length - 1].turn_id);
        } else {
          setSelectedTurnId(null);
        }
      } catch (e) {
        setDiffs([]);
        setSelectedTurnId(null);
      }
    } else {
      setDiffs([]);
      setSelectedTurnId(null);
    }
  };

  const handleDeleteSession = (id: string) => {
    removeStored(MNEMOS_MSGS_PREFIX + id);
    removeStored(MNEMOS_DIFFS_PREFIX + id);

    const remaining = sessions.filter((s) => s.id !== id);

    if (remaining.length === 0) {
      // Re-create default empty session if none left
      const freshId = `session-${Date.now().toString(36)}`;
      const freshSession: ChatSessionMeta = {
        id: freshId,
        title: 'New Conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        turnCount: 0
      };
      setSessions([freshSession]);
      setSessionId(freshId);
      setMessages([]);
      setDiffs([]);
      setSelectedTurnId(null);
      setStored(MNEMOS_SESSIONS_KEY, JSON.stringify([freshSession]));
      setStored(MNEMOS_ACTIVE_SESSION_KEY, freshId);
      setStored(MNEMOS_MSGS_PREFIX + freshId, JSON.stringify([]));
      setStored(MNEMOS_DIFFS_PREFIX + freshId, JSON.stringify([]));
      return;
    }

    setSessions(remaining);
    setStored(MNEMOS_SESSIONS_KEY, JSON.stringify(remaining));

    if (id === sessionId) {
      const nextActive = remaining[0];
      setSessionId(nextActive.id);
      setStored(MNEMOS_ACTIVE_SESSION_KEY, nextActive.id);

      const rawMsgs = getStored(MNEMOS_MSGS_PREFIX + nextActive.id);
      setMessages(rawMsgs ? JSON.parse(rawMsgs) : []);

      const rawDiffs = getStored(MNEMOS_DIFFS_PREFIX + nextActive.id);
      const parsedDiffs = rawDiffs ? JSON.parse(rawDiffs) : [];
      setDiffs(parsedDiffs);
      setSelectedTurnId(parsedDiffs.length > 0 ? parsedDiffs[parsedDiffs.length - 1].turn_id : null);
    }
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
        sidebarCollapsed,
        mobileSidebarOpen,
        setSidebarCollapsed,
        setMobileSidebarOpen,
        toggleSidebar,
        setSelectedTurnId,
        handleSendMessage,
        handleResetSession,
        handleCreateNewSession,
        handleSelectSession,
        handleDeleteSession,
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
