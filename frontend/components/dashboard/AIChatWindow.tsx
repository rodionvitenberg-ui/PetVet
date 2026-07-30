'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, PawPrint, Loader2, AlertTriangle } from 'lucide-react';
import { AIChatSession, AIChatMessage } from '@/types/ai-chat';
import { fetchMessages, streamResponse, createSession } from '@/services/aiChatService';

interface AIChatWindowProps {
  session: AIChatSession | null;
  pendingPetId: number | null;
  pendingQuery: string | null;
  onSessionCreated: (session: AIChatSession) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function AIChatWindow({
  session,
  pendingPetId,
  pendingQuery,
  onSessionCreated,
}: AIChatWindowProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingQuerySent = useRef(false);

  // Load message history when session changes
  useEffect(() => {
    if (session) {
      setIsLoadingHistory(true);
      setError(null);
      fetchMessages(session.id)
        .then(msgs => {
          setMessages(msgs);
          setIsLoadingHistory(false);
        })
        .catch(err => {
          console.error('Failed to load messages', err);
          setError('Failed to load conversation history.');
          setIsLoadingHistory(false);
        });
    } else {
      setMessages([]);
    }
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle pending query from PetsActionBar
  useEffect(() => {
    if (pendingQuery && pendingPetId && !pendingQuerySent.current) {
      pendingQuerySent.current = true;
      // The parent page will handle creating the session via createSession
      // Here we just need to display the pending state
    }
  }, [pendingQuery, pendingPetId]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom(false);
  }, [messages, streamingText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputText]);

  const scrollToBottom = (instant: boolean = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: instant ? 'auto' : 'smooth',
      });
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isStreaming) return;

    // If no session but pending pet, create session first
    if (!session && pendingPetId) {
      setIsStreaming(true);
      setError(null);
      const query = inputText.trim();
      setInputText('');
      try {
        const { session: newSession } = await createSession(pendingPetId, query);
        onSessionCreated(newSession);
        // Messages will be loaded when session prop updates
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create session');
        setIsStreaming(false);
      }
      return;
    }

    if (!session) return;

    const query = inputText.trim();
    setInputText('');
    setError(null);

    // Add user message locally
    const tempUserMsg: AIChatMessage = {
      id: Date.now(),
      session: session.id,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Start streaming
    setIsStreaming(true);
    setStreamingText('');

    const ctrl = streamResponse(session.id, query, {
      onToken: (token) => {
        setStreamingText(prev => prev + token);
      },
      onDone: (messageId) => {
        // Remove temp user msg and add real ones
        setMessages(prev => {
          // Replace temp user message with empty (will be refreshed when we reload)
          const withoutTemp = prev.filter(m => m.id !== tempUserMsg.id);
          // Add the AI message with final content
          const aiMsg: AIChatMessage = {
            id: messageId || Date.now(),
            session: session.id,
            role: 'assistant',
            content: streamingText + '', // will be captured by closure, let's use a different approach
            created_at: new Date().toISOString(),
          };
          return [...withoutTemp, tempUserMsg, aiMsg];
        });
        setStreamingText('');
        setIsStreaming(false);
        setAbortController(null);
        // Reload messages to get proper IDs
        if (session) {
          fetchMessages(session.id).then(setMessages).catch(console.error);
        }
      },
      onError: (errMsg) => {
        setError(errMsg);
        setIsStreaming(false);
        setStreamingText('');
        setAbortController(null);
      },
    });
    setAbortController(ctrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPetImageUrl = (): string | null => {
    if (!session?.pet?.images?.[0]?.image) return null;
    const img = session.pet.images[0].image;
    return img.startsWith('http') ? img : `${API_URL}${img}`;
  };

  const petImage = getPetImageUrl();

  // Empty state: no session selected
  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 h-full w-full">
        <div className="w-20 h-20 bg-[#FFCBA4]/30 rounded-full flex items-center justify-center mb-4">
          <Sparkles size={32} className="text-black/60" />
        </div>
        {pendingPetId ? (
          <>
            <p className="font-medium text-gray-500 mb-2">Type your first question below</p>
            <p className="text-sm text-gray-400">The AI assistant will analyze your pet's profile and answer.</p>
            <div className="mt-4 px-4 py-2 bg-[#FFCBA4]/40 rounded-xl text-sm text-gray-600 font-medium">
              New conversation will be created with your first message
            </div>
          </>
        ) : (
          <>
            <p className="font-medium text-gray-500 mb-2">Select a conversation or start a new one</p>
            <p className="text-sm text-gray-400">Ask questions about your pet's health, behaviour, and care.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Chat Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-white shadow-sm z-10 shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-gray-200 flex items-center justify-center">
          {petImage ? (
            <img src={petImage} className="w-full h-full object-cover" alt="" />
          ) : (
            <PawPrint size={18} className="text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800 text-sm truncate">
            {session.pet?.name || 'Pet'}
          </h3>
          <p className="text-xs text-gray-400 truncate">{session.title}</p>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium">Typing…</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/30 custom-scrollbar">
        {isLoadingHistory ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500">
            <AlertTriangle size={40} className="mb-3 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#FFCBA4] flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Sparkles size={14} className="text-black/70" />
                  </div>
                )}
                <div
                  className={`
                    max-w-[75%] rounded-2xl px-4 py-3 shadow-sm
                    ${msg.role === 'user'
                      ? 'bg-black text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                    }
                  `}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <span className={`text-[10px] mt-1.5 block opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {isStreaming && streamingText && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-full bg-[#FFCBA4] flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Sparkles size={14} className="text-black/70" />
                </div>
                <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-white border border-gray-100 rounded-bl-none shadow-sm">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {streamingText}
                    <span className="inline-block w-2 h-4 bg-black/40 ml-0.5 animate-pulse align-middle" />
                  </p>
                </div>
              </div>
            )}

            {/* Streaming with no text yet */}
            {isStreaming && !streamingText && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-[#FFCBA4] flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Sparkles size={14} className="text-black/70 animate-pulse" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-3"
        >
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${session.pet?.name || 'your pet'}...`}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FFCBA4]/50 bg-gray-50 text-sm resize-none custom-scrollbar"
            rows={1}
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
            className="bg-black text-white p-3 rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}