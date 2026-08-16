'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, PawPrint, Loader2, AlertTriangle } from 'lucide-react';
import { AIChatSession, AIChatMessage } from '@/types/ai-chat';
import { fetchMessages, streamResponse, streamSessionCreation } from '@/services/aiChatService';
import Markdown from '@/components/chat/Markdown';

interface AIChatWindowProps {
  session: AIChatSession | null;
  pendingPetId: number | null;
  pendingQuery: string | null;
  extraStreamingText?: string | null;
  onSessionCreated: (session: AIChatSession) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function AIChatWindow({
  session,
  pendingPetId,
  pendingQuery,
  extraStreamingText,
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
  const messagesAreaRef = useRef<HTMLDivElement>(null);
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
      // The parent page will handle creating the session via streamSessionCreation
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
    const area = messagesAreaRef.current;
    if (area) {
      // Скроллим только контейнер сообщений, не трогая страницу.
      area.scrollTop = area.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isStreaming) return;

    // If no session but pending pet, create session and stream the first response
    if (!session && pendingPetId) {
      setIsStreaming(true);
      setError(null);
      const query = inputText.trim();
      setInputText('');
      setStreamingText('');
      streamSessionCreation(pendingPetId, query, undefined, {
        onSession: (newSession) => {
          onSessionCreated(newSession);
        },
        onToken: (token) => {
          setStreamingText(prev => prev + token);
        },
        onDone: () => {
          setStreamingText('');
          setIsStreaming(false);
        },
        onError: (errMsg) => {
          setError(errMsg);
          setIsStreaming(false);
          setStreamingText('');
        },
      });
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
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/50 h-full w-full">
        <div className="w-20 h-20 bg-accent/30 rounded-full flex items-center justify-center mb-4">
          <Sparkles size={32} className="text-foreground/60" />
        </div>
        {pendingPetId ? (
          <>
            <p className="font-medium text-muted-foreground mb-2">Type your first question below</p>
            <p className="text-sm text-muted-foreground">The AI assistant will analyze your pet's profile and answer.</p>
            <div className="mt-4 px-4 py-2 bg-accent/40 rounded-xl text-sm text-muted-foreground font-medium">
              New conversation will be created with your first message
            </div>
          </>
        ) : (
          <>
            <p className="font-medium text-muted-foreground mb-2">Select a conversation or start a new one</p>
            <p className="text-sm text-muted-foreground">Ask questions about your pet's health, behaviour, and care.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-card h-full">
      {/* Chat Header */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-card shadow-sm z-10 shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0 border border-border flex items-center justify-center">
          {petImage ? (
            <img src={petImage} className="w-full h-full object-cover" alt="" />
          ) : (
            <PawPrint size={18} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-sm truncate">
            {session.pet?.name || 'Pet'}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{session.title}</p>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs font-medium">Typing…</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div ref={messagesAreaRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/30 custom-scrollbar">
        {isLoadingHistory ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-destructive">
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
                    <Sparkles size={14} className="text-foreground/70" />
                  </div>
                )}
                <div
                  className={`
                    max-w-[75%] rounded-2xl px-4 py-3 shadow-sm
                    ${msg.role === 'user'
                      ? 'bg-foreground text-background rounded-br-none'
                      : 'bg-card text-foreground border border-border rounded-bl-none'
                    }
                  `}
                >
                  {msg.role === 'assistant' ? (
                    <Markdown content={msg.content} />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  )}
                  <span className={`text-[10px] mt-1.5 block opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Streaming message (from local first message or external capture) */}
            {extraStreamingText && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-full bg-[#FFCBA4] flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Sparkles size={14} className="text-foreground/70" />
                </div>
                <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-card border border-border rounded-bl-none shadow-sm">
                  <Markdown content={extraStreamingText} />
                  <span className="inline-block w-2 h-4 bg-foreground/40 ml-0.5 animate-pulse align-middle" />
                </div>
              </div>
            )}

            {/* Streaming message */}
            {isStreaming && streamingText && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-full bg-[#FFCBA4] flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Sparkles size={14} className="text-foreground/70" />
                </div>
                <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-card border border-border rounded-bl-none shadow-sm">
                  <Markdown content={streamingText} />
                  <span className="inline-block w-2 h-4 bg-foreground/40 ml-0.5 animate-pulse align-middle" />
                </div>
              </div>
            )}

            {/* Streaming with no text yet */}
            {isStreaming && !streamingText && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-[#FFCBA4] flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Sparkles size={14} className="text-foreground/70 animate-pulse" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive flex items-center gap-2">
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
      <div className="p-4 bg-card border-t border-border shrink-0">
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
            className="flex-1 px-4 py-3 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/50 bg-muted text-sm resize-none custom-scrollbar"
            rows={1}
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
            className="bg-foreground text-background p-3 rounded-xl hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shrink-0"
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