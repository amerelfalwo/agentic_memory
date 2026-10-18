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
  PanelLeftClose,
  X
} from 'lucide-react';
import { useMemory } from '../../context/MemoryContext';

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const {
    sessionId,
    sessions,
    isStreaming,
    sidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    toggleSidebar,
    handleCreateNewSession,
    handleSelectSession,
    handleDeleteSession
  } = useMemory();

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

      {/* Sidebar Aside — Collapses to 0 width for true full screen agent view */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 bg-[#FFFFFF] border-r border-[#DFE5DD] flex flex-col shrink-0
          transition-all duration-300 ease-in-out overflow-hidden
          ${mobileSidebarOpen ? 'translate-x-0 w-72 shadow-xl' : '-translate-x-full md:translate-x-0'}
          ${sidebarCollapsed ? 'md:w-0 md:opacity-0 md:border-r-0 md:pointer-events-none' : 'md:w-72 md:opacity-100'}
        `}
      >
        <div className="w-72 flex flex-col h-full shrink-0">
          {/* Brand & Top Header */}
          <div className="h-16 border-b border-[#DFE5DD] px-4 flex items-center justify-between shrink-0 bg-[#FFFFFF]">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#0F766E]/30 bg-[#0b0f10] shadow-sm flex items-center justify-center shrink-0 p-0.5">
                <img
                  src="/brand/icon-128.png"
                  alt="Mnemos Logo"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-[#242A25] tracking-tight text-base leading-none">
                    Mnemos
                  </span>
                  <span className="text-[10px] font-bold bg-[#E6F7F5] text-[#0F766E] px-1.5 py-0.5 rounded border border-[#DFE5DD]">
                    CoALA
                  </span>
                </div>
                <span className="text-[11px] text-[#737B74] mt-0.5 font-medium truncate">
                  Cognitive Memory Engine
                </span>
              </div>
            </div>

            {/* Desktop Collapse & Mobile Close */}
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="hidden md:flex p-2 rounded-lg text-[#737B74] hover:text-[#0F766E] hover:bg-[#F6F6F0] transition-colors cursor-pointer"
                title="Collapse sidebar (Full Screen)"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="md:hidden p-2 rounded-lg text-[#737B74] hover:text-[#242A25] hover:bg-[#F6F6F0] transition-colors"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <div className="p-3 border-b border-[#DFE5DD] space-y-1 shrink-0">
            <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-[#737B74] uppercase tracking-wider">
              Navigation
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = isNavActive(item.href, item.isChat);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`
                      flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer
                      ${
                        active
                          ? 'bg-[#E6F7F5] text-[#0F766E] font-semibold border border-[#DFE5DD] shadow-2xs'
                          : 'text-[#242A25] hover:bg-[#F6F6F0] text-[#737B74] hover:text-[#242A25]'
                      }
                    `}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-[#0F766E]' : 'text-[#737B74]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Action: New Conversation */}
          <div className="p-3 border-b border-[#DFE5DD] shrink-0">
            <button
              onClick={() => {
                handleCreateNewSession();
                handleNavClick();
              }}
              disabled={isStreaming}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>New Conversation</span>
            </button>
          </div>

          {/* Recent Sessions List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
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
                    group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-all
                    ${
                      isActive
                        ? 'bg-[#E6F7F5] text-[#0F766E] font-medium border border-[#DFE5DD]'
                        : 'text-[#242A25] hover:bg-[#F6F6F0]'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-6">
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
          </div>
        </div>
      </aside>
    </>
  );
};
