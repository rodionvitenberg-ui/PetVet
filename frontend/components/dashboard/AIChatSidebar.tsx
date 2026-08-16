'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  Search, X, Plus, Sparkles, MessageSquare, 
  Trash2, PawPrint, Loader2, ChevronDown
} from 'lucide-react';
import { addToast, closeToast } from '@heroui/toast';
import { AIChatSession, SystemPrompt } from '@/types/ai-chat';
import { fetchSessions, deleteSession, fetchPrompts } from '@/services/aiChatService';

interface PetBasic {
  id: number;
  name: string;
  gender: 'M' | 'F';
  categories: { id: number; name: string }[];
  images?: { id: number; image: string }[];
}

interface AIChatSidebarProps {
  onSessionSelect: (session: AIChatSession) => void;
  onNewChat: (petId: number, promptId?: number) => void;
  onSessionDeleted?: (sessionId: number) => void;
  activeSessionId: number | null;
  refreshTrigger: number; // increment to refresh sessions list
  userPets: PetBasic[];
  filterPetId?: number | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function AIChatSidebar({
  onSessionSelect,
  onNewChat,
  onSessionDeleted,
  activeSessionId,
  refreshTrigger,
  userPets,
  filterPetId,
}: AIChatSidebarProps) {
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<number | undefined>(undefined);
  const [petDropdownOpen, setPetDropdownOpen] = useState(false);
  const [promptDropdownOpen, setPromptDropdownOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Fetch sessions
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [sessionsData, promptsData] = await Promise.all([
          fetchSessions(),
          fetchPrompts(),
        ]);
        setSessions(sessionsData);
        setPrompts(promptsData);
      } catch (err) {
        console.error('Failed to load sidebar data', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [refreshTrigger]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setPetDropdownOpen(false);
        setPromptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDelete = (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();

    const toastKey = addToast({
      title: 'Delete conversation?',
      description: 'This action cannot be undone.',
      color: 'danger',
      timeout: 8000,
      hideCloseButton: true,
      endContent: (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (toastKey) closeToast(toastKey);
              performDelete(sessionId);
            }}
            className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition"
          >
            Delete
          </button>
          <button
            onClick={() => {
              if (toastKey) closeToast(toastKey);
            }}
            className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-bold hover:bg-muted transition"
          >
            Cancel
          </button>
        </div>
      ),
    });
  };

  const performDelete = async (sessionId: number) => {
    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (onSessionDeleted) {
        onSessionDeleted(sessionId);
      }
      addToast({
        title: 'Conversation deleted',
        color: 'success',
        timeout: 3000,
      });
    } catch (err) {
      console.error('Failed to delete session', err);
      addToast({
        title: 'Failed to delete conversation',
        description: err instanceof Error ? err.message : 'Unknown error',
        color: 'danger',
        timeout: 5000,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartNewChat = () => {
    if (!selectedPetId) return;
    onNewChat(selectedPetId, selectedPromptId);
    setShowNewChatForm(false);
    setSelectedPetId(null);
    setSelectedPromptId(undefined);
  };

  const selectedPet = userPets.find(p => p.id === selectedPetId);
  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);
  // При входе с ?petId=X показываем только переписки этого питомца.
  const visibleSessions = filterPetId
    ? sessions.filter(s => s.pet?.id === filterPetId)
    : sessions;

  const getPetImageUrl = (session: AIChatSession): string | null => {
    const img = session.pet?.images?.[0]?.image;
    if (!img) return null;
    return img.startsWith('http') ? img : `${API_URL}${img}`;
  };

  return (
    <div ref={sidebarRef} className="w-full h-full bg-muted flex flex-col border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-[#FFCBA4] p-1.5 rounded-lg">
              <Sparkles size={18} className="text-foreground/80" />
            </div>
            <h2 className="font-bold text-lg text-foreground">AI Assistant</h2>
          </div>
        </div>
        
        {/* New Chat Button */}
        <button
          onClick={() => setShowNewChatForm(prev => !prev)}
          disabled={userPets.length === 0}
          className={`
            w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all
            ${showNewChatForm
              ? 'bg-muted text-foreground'
              : 'bg-foreground text-background hover:bg-foreground/90'}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {showNewChatForm ? <X size={18} /> : <Plus size={18} />}
          {showNewChatForm ? 'Cancel' : 'New Chat'}
        </button>
      </div>

      {/* New Chat Form */}
      {showNewChatForm && (
        <div className="p-4 bg-card border-b border-border space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
          {/* Pet Selector */}
          <div className="relative">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Pet</label>
            <button
              onClick={() => {
                setPetDropdownOpen(prev => !prev);
                setPromptDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-left hover:border-border transition"
            >
              {selectedPet ? (
                <>
                  <PawPrint size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-foreground truncate">{selectedPet.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Select a pet...</span>
              )}
              <ChevronDown size={14} className="text-muted-foreground ml-auto shrink-0" />
            </button>
            {petDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-card rounded-xl shadow-lg border border-border overflow-hidden z-20 py-1">
                {userPets.map(pet => (
                  <button
                    key={pet.id}
                    onClick={() => {
                      setSelectedPetId(pet.id);
                      setPetDropdownOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-sm transition
                      ${selectedPetId === pet.id ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted'}
                    `}
                  >
                    <PawPrint size={14} />
                    <span className="truncate">{pet.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Prompt Selector */}
          {prompts.length > 0 && (
            <div className="relative">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Persona</label>
              <button
                onClick={() => {
                  setPromptDropdownOpen(prev => !prev);
                  setPetDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-left hover:border-border transition"
              >
                <span className="text-foreground truncate">{selectedPrompt?.name || 'Default'}</span>
                <ChevronDown size={14} className="text-muted-foreground ml-auto shrink-0" />
              </button>
              {promptDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-card rounded-xl shadow-lg border border-border overflow-hidden z-20 py-1">
                  <button
                    onClick={() => {
                      setSelectedPromptId(undefined);
                      setPromptDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    Default
                  </button>
                  {prompts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPromptId(p.id);
                        setPromptDropdownOpen(false);
                      }}
                      className={`
                        w-full px-3 py-2 text-sm transition
                        ${selectedPromptId === p.id ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted'}
                      `}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStartNewChat}
            disabled={!selectedPetId}
            className="w-full py-2.5 bg-[#FFCBA4] text-foreground font-bold rounded-xl hover:bg-[#ffbca0] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            Start Chat
          </button>
        </div>
      )}

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No conversations yet.</p>
            <p className="text-xs mt-1">Start a new chat about your pet.</p>
          </div>
        ) : (
          <div className="py-2">
            {visibleSessions.map(session => {
              const petImage = getPetImageUrl(session);
              return (
                <div
                  key={session.id}
                  onClick={() => onSessionSelect(session)}
                  className={`
                    mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all group
                    ${activeSessionId === session.id
                      ? 'bg-card shadow-sm border border-border'
                      : 'hover:bg-card/70 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Pet avatar */}
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-muted shrink-0 border border-border flex items-center justify-center">
                      {petImage ? (
                        <img src={petImage} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <PawPrint size={14} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground truncate">
                          {session.pet?.name || 'Unknown'}
                        </p>
                        <button
                          onClick={(e) => handleDelete(e, session.id)}
                          disabled={deletingId === session.id}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded-lg transition text-muted-foreground hover:text-destructive disabled:opacity-100"
                        >
                          {deletingId === session.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {session.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(session.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}