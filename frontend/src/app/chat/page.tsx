'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  ShieldAlert,
  PanelLeft,
  Check,
  Copy
} from 'lucide-react';
import { useMemory } from '../../context/MemoryContext';
import { MemoryActivityAccordion } from '../../components/chat/MemoryActivityAccordion';

export default function ChatPage() {
  const {
    messages,
    handleSendMessage,
    isStreaming,
    streamingContent,
    statusText,
    sessionId,
    sessions,
    sidebarCollapsed,
    toggleSidebar
  } = useMemory();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find((s) => s.id === sessionId);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const prompt = input.trim();
    setInput('');
    handleSendMessage(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestedQuestions = [
    'How does the CoALA framework structure agent memory across 4 subsystems?',
    'What is the role of episodic memory in preventing repeated mistakes?',
    'Explain how procedural guidelines evolve dynamically through reflection.',
    'How does working memory handle context window limits through summarization?'
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F6F6F0] relative">
      {/* Floating Controls Overlay (No bulky navbar: agent takes true full screen) */}
      <div className="absolute top-3 inset-x-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Toggle Button to re-open sidebar when collapsed */}
        <div className="pointer-events-auto flex items-center space-x-2">
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white border border-[#DFE5DD] hover:border-[#0F766E] shadow-sm hover:shadow-md text-[#242A25] text-xs font-semibold backdrop-blur-md transition-all cursor-pointer group"
              title="Open Sidebar"
            >
              <div className="w-5 h-5 rounded-md overflow-hidden bg-[#0b0f10] border border-[#0F766E]/40 shrink-0">
                <img src="/brand/icon-64.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <PanelLeft className="w-4 h-4 text-[#0F766E] group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-[#0F766E]">Mnemos</span>
            </button>
          )}

          {currentSession?.turnCount && currentSession.turnCount > 0 ? (
            <span className="text-[10px] font-mono text-[#0F766E] bg-white/90 px-2 py-1 rounded-lg border border-[#DFE5DD] shadow-2xs backdrop-blur-xs">
              Turn #{currentSession.turnCount}
            </span>
          ) : null}
        </div>

        {/* Floating status indicator during reasoning & memory retrieval */}
        {statusText && (
          <div className="pointer-events-auto flex items-center space-x-2 text-xs text-[#0F766E] bg-white/95 px-3 py-1.5 rounded-full border border-[#DFE5DD] shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse"></span>
            <span className="font-medium text-[11px]">{statusText}</span>
          </div>
        )}
      </div>

      {/* Message Stream Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-5 pt-4">
          {/* Empty State with Prominent Mnemos Logo & Badges */}
          {messages.length === 0 && !streamingContent && (
            <div className="py-12 px-4 text-center max-w-2xl mx-auto">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#0F766E]/40 bg-[#0b0f10] mx-auto mb-5 shadow-xl shadow-[#0F766E]/15 p-1 transition-transform hover:scale-105 duration-200">
                <img
                  src="/brand/icon-128.png"
                  alt="Mnemos Brandmark"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>

              <div className="inline-flex items-center space-x-2 bg-[#E6F7F5] border border-[#0F766E]/20 text-[#0F766E] text-xs font-semibold px-3 py-1 rounded-full mb-3 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] animate-pulse"></span>
                <span>CoALA Cognitive Memory Engine</span>
              </div>

              <h2 className="text-2xl font-bold text-[#242A25] tracking-tight">
                Mnemos
              </h2>
              <p className="text-xs sm:text-sm text-[#737B74] mt-2 max-w-lg mx-auto leading-relaxed">
                Advanced cognitive agent coordinating Working, Episodic, Semantic, and Procedural memory to reason, learn from past turns, and continuously ground dialogue.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left max-w-xl mx-auto">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    disabled={isStreaming}
                    className="p-3.5 rounded-xl bg-[#FFFFFF] hover:bg-[#E6F7F5] border border-[#DFE5DD] hover:border-[#14B8A6] text-xs text-[#242A25] transition-all text-left shadow-xs hover:shadow-sm cursor-pointer group"
                  >
                    <div className="text-[10px] font-bold text-[#14B8A6] group-hover:text-[#0F766E] mb-1">
                      Suggested Query #{idx + 1}
                    </div>
                    <div className="leading-snug font-medium text-[#242A25]">{q}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Messages */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`
                    rounded-lg text-sm transition-shadow max-w-full sm:max-w-[85%]
                    ${
                      isUser
                        ? 'bg-[#E6F7F5] border border-[#DFE5DD] text-[#242A25] px-4 py-3 shadow-xs'
                        : msg.securityBlocked
                        ? 'bg-[#FFF5F5] border border-[#B54747]/30 text-[#242A25] p-4 shadow-xs'
                        : 'bg-[#FFFFFF] border border-[#DFE5DD] text-[#242A25] p-4 shadow-xs w-full'
                    }
                  `}
                >
                  {/* Header line for message */}
                  <div className="flex items-center justify-between text-[11px] text-[#737B74] mb-1.5 pb-1 border-b border-[#DFE5DD]/60">
                    <div className="flex items-center space-x-1.5">
                      {!isUser && (
                        <div className="w-4 h-4 rounded overflow-hidden bg-[#0b0f10] border border-[#0F766E]/40 shrink-0">
                          <img src="/brand/icon-64.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="font-semibold text-[#0F766E]">
                        {isUser ? 'You' : 'Mnemos'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {msg.turnId && <span>Turn #{msg.turnId}</span>}
                      {!isUser && (
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="text-[#737B74] hover:text-[#242A25] transition-colors"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-[#0F766E]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Security Alert if Blocked */}
                  {msg.securityBlocked && (
                    <div className="flex items-center space-x-1.5 text-[#B54747] font-semibold text-xs mb-2 bg-[#FEE2E2] p-2 rounded border border-[#B54747]/20">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Security Alert: {msg.blockedReason || 'Query was flagged by security guardrail.'}</span>
                    </div>
                  )}

                  {/* Message Body */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">{msg.content}</p>
                  ) : (
                    <div className="prose-editorial">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  {/* Memory Transparency Accordion */}
                  {!isUser && msg.diff && (
                    <MemoryActivityAccordion diff={msg.diff} turnId={msg.turnId} />
                  )}
                </div>
              </div>
            );
          })}

          {/* Streaming Assistant Response */}
          {isStreaming && (
            <div className="flex flex-col items-start">
              <div className="rounded-lg bg-[#FFFFFF] border border-[#DFE5DD] text-[#242A25] p-4 shadow-xs w-full max-w-full sm:max-w-[85%]">
                <div className="flex items-center justify-between text-[11px] text-[#737B74] mb-1.5 pb-1 border-b border-[#DFE5DD]/60">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-4 h-4 rounded overflow-hidden bg-[#0b0f10] border border-[#0F766E]/40 shrink-0">
                      <img src="/brand/icon-64.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-semibold text-[#0F766E]">Mnemos</span>
                  </div>
                  <span className="text-[10px] text-[#0F766E] bg-[#E6F7F5] px-1.5 py-0.5 rounded flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] animate-pulse"></span>
                    <span>Thinking & Recalling...</span>
                  </span>
                </div>
                {streamingContent ? (
                  <div className="prose-editorial">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    <span className="inline-block w-1.5 h-3 bg-[#0F766E] ml-1 animate-pulse align-middle" />
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-xs text-[#737B74] py-2">
                    <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-ping" />
                    <span className="animate-pulse">{statusText || 'Connecting to CoALA memory subsystems...'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Composer Area */}
      <div className="border-t border-[#DFE5DD] bg-[#FFFFFF] p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center rounded-lg border border-[#DFE5DD] bg-[#F6F6F0] focus-within:border-[#0F766E] focus-within:ring-1 focus-within:ring-[#0F766E] transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
              placeholder={
                isStreaming
                  ? 'Agent reasoning and synchronizing memory...'
                  : 'Ask about CoALA memory systems or research queries (Enter to send, Shift+Enter for newline)...'
              }
              className="w-full bg-transparent px-3.5 py-3 text-xs sm:text-sm text-[#242A25] placeholder-[#737B74] focus:outline-none resize-none min-h-[44px] max-h-32"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="mr-2 px-3.5 py-1.5 rounded-md bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 text-[11px] text-[#737B74] px-1">
            <span>CoALA Cognitive Agentic Engine</span>
            <span>All 4 memory layers active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
