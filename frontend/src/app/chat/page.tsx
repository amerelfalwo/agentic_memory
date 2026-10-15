'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Sparkles,
  ShieldAlert,
  PanelLeft,
  X,
  RotateCcw,
  Check,
  Copy
} from 'lucide-react';
import { useMemory } from '../../context/MemoryContext';
import { ChatSidebar } from '../../components/chat/ChatSidebar';
import { MemoryActivityAccordion } from '../../components/chat/MemoryActivityAccordion';

export default function ChatPage() {
  const {
    messages,
    handleSendMessage,
    isStreaming,
    streamingContent,
    statusText,
    sessionId,
    sessions
  } = useMemory();

  const [input, setInput] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
    <div className="flex-1 flex overflow-hidden bg-[#F6F6F0]">
      {/* Left Sidebar */}
      <ChatSidebar
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Chat Column */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F6F6F0] relative">
        {/* Chat Sub-Header */}
        <div className="h-11 border-b border-[#DFE5DD] bg-[#FFFFFF] px-4 flex items-center justify-between text-xs text-[#737B74]">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden p-1 rounded hover:bg-[#F6F6F0] text-[#242A25]"
              title="Toggle sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-[#242A25] truncate">
              {currentSession?.title || 'Cognitive Chat Session'}
            </span>
          </div>

          {statusText && (
            <div className="flex items-center space-x-1.5 text-[11px] text-[#285943] bg-[#E8F0E8] px-2.5 py-0.5 rounded border border-[#DFE5DD]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#285943] animate-pulse"></span>
              <span>{statusText}</span>
            </div>
          )}
        </div>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Empty State */}
            {messages.length === 0 && !streamingContent && (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[#E8F0E8] text-[#285943] mx-auto flex items-center justify-center mb-3 border border-[#DFE5DD]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-base font-semibold text-[#242A25] tracking-tight">
                  Cognitive Memory Interactive Dialogue
                </h2>
                <p className="text-xs text-[#737B74] mt-1 max-w-md mx-auto leading-relaxed">
                  Engage with the CoALA architecture agent. The system orchestrates working, episodic, semantic, and procedural memory to ground every response.
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-xl mx-auto">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      disabled={isStreaming}
                      className="p-3 rounded-lg bg-[#FFFFFF] hover:bg-[#E8F0E8] border border-[#DFE5DD] text-xs text-[#242A25] transition-all text-left shadow-2xs hover:border-[#8DAA91] cursor-pointer group"
                    >
                      <div className="text-[10px] font-medium text-[#8DAA91] group-hover:text-[#285943] mb-0.5">
                        Suggested Query #{idx + 1}
                      </div>
                      <div className="leading-snug">{q}</div>
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
                          ? 'bg-[#E8F0E8] border border-[#DFE5DD] text-[#242A25] px-4 py-3 shadow-xs'
                          : msg.securityBlocked
                          ? 'bg-[#FFF5F5] border border-[#B54747]/30 text-[#242A25] p-4 shadow-xs'
                          : 'bg-[#FFFFFF] border border-[#DFE5DD] text-[#242A25] p-4 shadow-xs w-full'
                      }
                    `}
                  >
                    {/* Header line for message */}
                    <div className="flex items-center justify-between text-[11px] text-[#737B74] mb-1.5 pb-1 border-b border-[#DFE5DD]/60">
                      <span className="font-semibold text-[#285943]">
                        {isUser ? 'You' : 'Agentic Memory'}
                      </span>
                      <div className="flex items-center space-x-2">
                        {msg.turnId && <span>Turn #{msg.turnId}</span>}
                        {!isUser && (
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="text-[#737B74] hover:text-[#242A25] transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-[#285943]" />
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
            {isStreaming && streamingContent && (
              <div className="flex flex-col items-start">
                <div className="rounded-lg bg-[#FFFFFF] border border-[#DFE5DD] text-[#242A25] p-4 shadow-xs w-full max-w-full sm:max-w-[85%]">
                  <div className="flex items-center justify-between text-[11px] text-[#737B74] mb-1.5 pb-1 border-b border-[#DFE5DD]/60">
                    <span className="font-semibold text-[#285943]">Agentic Memory</span>
                    <span className="text-[10px] text-[#285943] bg-[#E8F0E8] px-1.5 py-0.5 rounded">
                      Streaming
                    </span>
                  </div>
                  <div className="prose-editorial">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    <span className="inline-block w-1.5 h-3 bg-[#285943] ml-1 animate-pulse align-middle" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Composer Area */}
        <div className="border-t border-[#DFE5DD] bg-[#FFFFFF] p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative flex items-center rounded-lg border border-[#DFE5DD] bg-[#F6F6F0] focus-within:border-[#285943] focus-within:ring-1 focus-within:ring-[#285943] transition-all">
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
                className="mr-2 px-3.5 py-1.5 rounded-md bg-[#285943] hover:bg-[#1E4433] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
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
    </div>
  );
}
