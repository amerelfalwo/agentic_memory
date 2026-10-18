'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  GitFork,
  BookOpen,
  Plus,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useMemory } from '../../context/MemoryContext';

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const {
    sessionId,
    sessions,
    diffs,
    modelName,
    vectorDbConnected,
    isStreaming,
    sidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    toggleSidebar,
    handleCreateNewSession,
    handleSelectSession,
    handleDeleteSession,
    handleResetSession
  } = useMemory();

  const currentTurn = diffs.length > 0 ? diffs[diffs.length - 1].turn_id : 0;

  const navItems = [
    { label: 'Chat', href: '/chat', icon: MessageSquare, isChat: true },
    { label: 'Memory Graph', href: '/memory-graph', icon: GitFork },
    { label: 'Guidelines', href: '/guidelines', icon: BookOpen }
  ];

  const isNavActive = (href: string, isChat?: boolean) => {
    if (isChat && (pathname === '/chat' || pathname === '/')) return true;
    return pathname.startsWith(href);
  };

  const handleNavClick = () => {
    if (mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 bg-[#FFFFFF] border-r border-[#DFE5DD] flex flex-col shrink-0
          transition-all duration-200 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0 w-72 shadow-xl' : '-translate-x-full md:translate-x-0'}
          ${sidebarCollapsed ? 'md:w-16' : 'md:w-68'}
        `}
      >
        {/* Brand & Top Header */}
        <div className="h-14 border-b border-[#DFE5DD] px-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs shrink-0">
              MN
            </div>
            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <div className="flex items-center space-x-1.5 overflow-hidden">
                <span className="font-bold text-[#242A25] tracking-tight text-sm truncate">
                  Mnemos
                </span>
                <span className="text-[10px] font-semibold bg-[#E6F7F5] text-[#0F766E] px-1.5 py-0.5 rounded border border-[#DFE5DD] shrink-0">
                  CoALA
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Mobile Close Button */}
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 rounded-md text-[#737B74] hover:text-[#0F766E] hover:bg-[#F6F6F0] transition-colors cursor-pointer"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-md text-[#737B74] hover:text-[#242A25] hover:bg-[#F6F6F0] transition-colors"
              title="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="p-2 border-b border-[#DFE5DD] space-y-1 shrink-0">
          {(!sidebarCollapsed || mobileSidebarOpen) && (
            <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-[#737B74] uppercase tracking-wider">
              Navigation
            </div>
          )}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isNavActive(item.href, item.isChat);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  title={sidebarCollapsed && !mobileSidebarOpen ? item.label : undefined}
                  className={`
                    flex items-center rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer
                    ${sidebarCollapsed && !mobileSidebarOpen ? 'justify-center p-2.5' : 'space-x-2.5 px-3 py-2'}
                    ${
                      active
                        ? 'bg-[#E6F7F5] text-[#0F766E] font-semibold border border-[#DFE5DD] shadow-xs'
                        : 'text-[#242A25] hover:bg-[#F6F6F0] text-[#737B74] hover:text-[#242A25]'
                    }
                  `}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-[#0F766E]' : 'text-[#737B74]'
                    }`}
                  />
                  {(!sidebarCollapsed || mobileSidebarOpen) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action: New Conversation */}
        <div className="p-2.5 border-b border-[#DFE5DD] shrink-0">
          <button
            onClick={() => {
              handleCreateNewSession();
              handleNavClick();
            }}
            disabled={isStreaming}
            title={sidebarCollapsed && !mobileSidebarOpen ? 'New Conversation' : undefined}
            className={`
              w-full flex items-center justify-center rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer
              ${sidebarCollapsed && !mobileSidebarOpen ? 'p-2.5' : 'space-x-2 px-3 py-2'}
            `}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {(!sidebarCollapsed || mobileSidebarOpen) && <span>New Conversation</span>}
          </button>
        </div>

        {/* Recent Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(!sidebarCollapsed || mobileSidebarOpen) ? (
            <>
              <div className="flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-[#737B74] uppercase tracking-wider">
                <span>Recent Sessions</span>
                <span className="text-[10px] font-normal">{sessions.length}</span>
              </div>

              {sessions.map((session) => {
                const isActive = session.id === sessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      handleSelectSession(session.id);
                      handleNavClick();
                    }}
                    className={`
                      group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all
                      ${
                        isActive
                          ? 'bg-[#E6F7F5] text-[#0F766E] font-medium border border-[#DFE5DD]'
                          : 'text-[#242A25] hover:bg-[#F6F6F0]'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-6">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-[#0F766E]' : 'text-[#737B74]'
                        }`}
                      />
                      <span className="truncate" title={session.title}>
                        {session.title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {session.turnCount > 0 && (
                        <span className="text-[10px] text-[#737B74] font-mono group-hover:hidden">
                          T{session.turnCount}
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete session "${session.title}"?`)) {
                            handleDeleteSession(session.id);
                          }
                        }}
                        className="hidden group-hover:flex p-1 rounded hover:bg-[#FFFFFF] text-[#737B74] hover:text-[#B54747] transition-colors"
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            /* Collapsed rail indicators */
            <div className="space-y-1 py-1">
              {sessions.slice(0, 8).map((session) => {
                const isActive = session.id === sessionId;
                return (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    title={session.title}
                    className={`
                      w-full flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer
                      ${
                        isActive
                          ? 'bg-[#E6F7F5] text-[#0F766E]'
                          : 'text-[#737B74] hover:bg-[#F6F6F0] hover:text-[#242A25]'
                      }
                    `}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Operational Status & Footer */}
        <div className="border-t border-[#DFE5DD] bg-[#F6F6F0] p-2.5 shrink-0 text-xs text-[#737B74]">
          {(!sidebarCollapsed || mobileSidebarOpen) ? (
            <div className="space-y-2">
              {/* System Badges */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        vectorDbConnected ? 'bg-[#0F766E]' : 'bg-[#B7791F]'
                      }`}
                    />
                    <span className="text-[#242A25] font-medium">
                      {vectorDbConnected ? 'Weaviate Memory' : 'Vector Memory'}
                    </span>
                  </div>
                  {currentTurn > 0 && (
                    <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#DFE5DD]">
                      Turn #{currentTurn}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between px-1 text-[10px]">
                  <div className="flex items-center space-x-1 truncate max-w-[170px]" title={modelName}>
                    <Cpu className="w-3 h-3 text-[#0F766E] shrink-0" />
                    <span className="truncate text-[#737B74]">{modelName}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[#0F766E] font-medium">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Armed</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Local Sync Indicator */}
              <div className="pt-2 border-t border-[#DFE5DD] flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1 text-[#737B74]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Saved locally</span>
                </div>

                <button
                  onClick={() => {
                    if (confirm('Reset conversation and wipe working memory for active session?')) {
                      handleResetSession();
                    }
                  }}
                  disabled={isStreaming}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-[#FFFFFF] text-[#737B74] hover:text-[#B54747] transition-colors"
                  title="Reset active session"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          ) : (
            /* Collapsed rail footer */
            <div className="flex flex-col items-center space-y-2 py-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  vectorDbConnected ? 'bg-[#0F766E]' : 'bg-[#B7791F]'
                }`}
                title={vectorDbConnected ? 'Weaviate Connected' : 'Vector Offline'}
              />
              <button
                onClick={() => {
                  if (confirm('Reset conversation for active session?')) {
                    handleResetSession();
                  }
                }}
                disabled={isStreaming}
                className="p-1 rounded text-[#737B74] hover:text-[#B54747] hover:bg-white"
                title="Reset active session"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
