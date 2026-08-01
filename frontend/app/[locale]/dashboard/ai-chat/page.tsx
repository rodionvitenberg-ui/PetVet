'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import AuthGuard from '@/components/providers/AuthGuard';
import AIChatSidebar from '@/components/dashboard/AIChatSidebar';
import AIChatWindow from '@/components/dashboard/AIChatWindow';
import { AIChatSession } from '@/types/ai-chat';
import { createSession } from '@/services/aiChatService';

interface PetBasic {
  id: number;
  name: string;
  gender: 'M' | 'F';
  categories: { id: number; name: string }[];
  images?: { id: number; image: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function AIChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const petIdParam = searchParams.get('petId');
  const queryParam = searchParams.get('query');

  const [activeSession, setActiveSession] = useState<AIChatSession | null>(null);
  const [userPets, setUserPets] = useState<PetBasic[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [pendingPetId, setPendingPetId] = useState<number | null>(null);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Защита от двойного создания сессии из URL-параметров.
  // useSearchParams может пересоздавать объект, из-за чего useEffect
  // срабатывает повторно и создаёт две одинаковые сессии.
  const creatingFromParamsRef = useRef(false);
  const createdParamsRef = useRef('');

  // Fetch user's pets
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('access_token');
    fetch(`${API_URL}/api/pets/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setUserPets(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, [user]);

  // Handle incoming query from PetsActionBar
  useEffect(() => {
    if (!petIdParam || !queryParam) return;

    const petId = parseInt(petIdParam, 10);
    if (isNaN(petId)) return;

    const paramsKey = `${petId}:${queryParam}`;
    // Пропускаем, если этот запрос уже обработан или создание уже идёт.
    if (creatingFromParamsRef.current || createdParamsRef.current === paramsKey) {
      return;
    }

    setPendingPetId(petId);
    setPendingQuery(queryParam);
    handleCreateSessionFromParams(petId, queryParam, paramsKey);
  }, [petIdParam, queryParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateSessionFromParams = async (
    petId: number,
    query: string,
    paramsKey: string,
  ) => {
    creatingFromParamsRef.current = true;
    createdParamsRef.current = paramsKey;
    setIsCreatingSession(true);
    setError(null);
    try {
      const { session } = await createSession(petId, query);
      setActiveSession(session);
      setPendingPetId(null);
      setPendingQuery(null);
      setSidebarRefresh(prev => prev + 1);
      // Clear URL params
      router.replace('/dashboard/ai-chat', { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsCreatingSession(false);
      creatingFromParamsRef.current = false;
    }
  };

  const handleSessionSelect = useCallback((session: AIChatSession) => {
    setActiveSession(session);
    setPendingPetId(null);
    setPendingQuery(null);
    setError(null);
  }, []);

  const handleNewChat = useCallback(async (petId: number, promptId?: number) => {
    // Just select pet — user types message in the chat window
    // We set activeSession to null with pending info
    setActiveSession(null);
    setPendingPetId(petId);
    setPendingQuery(null);
    setError(null);
  }, []);

  const handleSessionCreated = useCallback((session: AIChatSession) => {
    setActiveSession(session);
    setSidebarRefresh(prev => prev + 1);
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50/50 pt-20 pb-0 px-0">
        <div className="h-[calc(100vh-5rem)] flex bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mx-4 sm:mx-6">
          {/* Sidebar */}
          <div className="w-[320px] shrink-0 hidden md:block">
            <AIChatSidebar
              onSessionSelect={handleSessionSelect}
              onNewChat={handleNewChat}
              onSessionDeleted={(deletedId) => {
                if (activeSession?.id === deletedId) {
                  setActiveSession(null);
                }
              }}
              activeSessionId={activeSession?.id || null}
              refreshTrigger={sidebarRefresh}
              userPets={userPets}
            />
          </div>

          {/* Mobile: simplified view */}
          <div className="flex-1 flex flex-col min-w-0">
            {isCreatingSession ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-[#FFCBA4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Creating conversation...</p>
                </div>
              </div>
            ) : error && !activeSession ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-red-500">
                  <p className="font-bold mb-2">Something went wrong</p>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-4 px-4 py-2 bg-gray-100 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <AIChatWindow
                session={activeSession}
                pendingPetId={pendingPetId}
                pendingQuery={pendingQuery}
                onSessionCreated={handleSessionCreated}
              />
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}