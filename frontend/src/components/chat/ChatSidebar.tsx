'use client';

import React from 'react';
import { Plus, MessageSquare, Clock, Trash2 } from 'lucide-react';
import { useMemory } from '../../context/MemoryContext';

interface ChatSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpenMobile, onCloseMobile }) => {
  const {
    sessionId,
    sessions,
    handleCreateNewSession,
    handleSelectSession,
    handleResetSession,
    isStreaming
  } = useMemory();

  return (
    <aside
      className={`
        w-64 border-r border-[#DFE5DD] bg-[#FFFFFF] flex flex-col shrink-0
        ${isOpenMobile ? 'fixed inset-y-0 left-0 z-50 shadow-lg' : 'hidden md:flex'}
      `}
    >
      {/* Top Action */}
      <div className="p-3.5 border-b border-[#DFE5DD] flex items-center justify-between">
        <button
          onClick={handleCreateNewSession}
          disabled={isStreaming}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-md bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1.5 text-[11px] font-semibold text-[#737B74] uppercase tracking-wider">
          Recent Sessions
        </div>

        {sessions.map((session) => {
          const isActive = session.id === sessionId;
          return (
            <div
              key={session.id}
              onClick={() => {
                handleSelectSession(session.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`
                group flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer transition-colors
                ${
                  isActive
                    ? 'bg-[#E6F7F5] text-[#0F766E] font-medium border border-[#DFE5DD]'
                    : 'text-[#242A25] hover:bg-[#F6F6F0]'
                }
              `}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#0F766E]' : 'text-[#737B74]'}`} />
                <span className="truncate">{session.title}</span>
              </div>

              {session.turnCount > 0 && (
                <span className="text-[10px] text-[#737B74] font-mono shrink-0 ml-1.5">
                  T{session.turnCount}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-[#DFE5DD] bg-[#F6F6F0] flex items-center justify-between text-xs text-[#737B74]">
        <div className="flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[11px]">Auto-saved locally</span>
        </div>
        <button
          onClick={() => {
            if (confirm('Clear messages in current session?')) {
              handleResetSession();
            }
          }}
          disabled={isStreaming}
          className="p-1 rounded text-[#737B74] hover:text-[#B54747] hover:bg-[#FFFFFF] transition-colors"
          title="Clear active session"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
