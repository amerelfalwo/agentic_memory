'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, GitFork, BookOpen, RotateCcw, ShieldCheck, Database, Cpu } from 'lucide-react';
import { useMemory } from '../context/MemoryContext';

export const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const {
    modelName,
    vectorDbConnected,
    diffs,
    handleResetSession,
    isStreaming
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

  return (
    <header className="border-b border-[#DFE5DD] bg-[#FFFFFF] sticky top-0 z-40 px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Framework */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#285943] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
            MN
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#242A25] tracking-tight text-sm sm:text-base">
              Mnemos
            </span>
            <span className="text-[11px] font-medium bg-[#E8F0E8] text-[#285943] px-2 py-0.5 rounded border border-[#DFE5DD]">
              CoALA
            </span>
          </div>
        </div>

        {/* Central 3-Item Primary Navigation */}
        <nav className="flex items-center space-x-1 bg-[#F6F6F0] p-1 rounded-lg border border-[#DFE5DD]">
          {navItems.map((item) => {
            const active = isNavActive(item.href, item.isChat);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[#E8F0E8] text-[#285943] font-semibold shadow-xs'
                    : 'text-[#737B74] hover:text-[#242A25] hover:bg-[#FFFFFF]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#285943]' : 'text-[#737B74]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Compact Right-Side Operational Status Area */}
        <div className="flex items-center space-x-3 text-xs text-[#737B74]">
          {/* Vector DB */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#F6F6F0] border border-[#DFE5DD]">
            <span
              className={`w-2 h-2 rounded-full ${
                vectorDbConnected ? 'bg-[#285943]' : 'bg-[#B7791F]'
              }`}
            />
            <span className="font-medium text-[#242A25]">
              {vectorDbConnected ? 'Weaviate' : 'Vector Memory'}
            </span>
          </div>

          {/* Model Name */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#F6F6F0] border border-[#DFE5DD]">
            <Cpu className="w-3.5 h-3.5 text-[#285943]" />
            <span className="text-[#242A25] font-mono text-[11px]">{modelName}</span>
          </div>

          {/* Guardrail */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2 py-1 rounded-md bg-[#E8F0E8] text-[#285943] border border-[#DFE5DD] font-medium text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#285943]" />
            <span>Guardrail Armed</span>
          </div>

          {/* Turn count */}
          {currentTurn > 0 && (
            <div className="px-2 py-1 rounded-md bg-[#F6F6F0] border border-[#DFE5DD] font-mono text-[11px] text-[#242A25]">
              Turn #{currentTurn}
            </div>
          )}

          {/* Reset session button */}
          <button
            onClick={() => {
              if (confirm('Reset active conversation and clear memory cache for this session?')) {
                handleResetSession();
              }
            }}
            disabled={isStreaming}
            className="p-1.5 rounded-md hover:bg-[#E8F0E8] text-[#737B74] hover:text-[#285943] transition-colors disabled:opacity-40"
            title="Reset Session History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
