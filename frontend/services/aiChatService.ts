import { AIChatSession, AIChatMessage, SystemPrompt } from '@/types/ai-chat';
import { apiClient } from '@/lib/apiClient';

export async function fetchPrompts(): Promise<SystemPrompt[]> {
  return apiClient<SystemPrompt[]>('/api/ai/prompts/');
}

export async function fetchSessions(petId?: number): Promise<AIChatSession[]> {
  const params = petId ? `?pet_id=${petId}` : '';
  return apiClient<AIChatSession[]>(`/api/ai/sessions/list/${params}`);
}

export async function fetchMessages(sessionId: number): Promise<AIChatMessage[]> {
  return apiClient<AIChatMessage[]>(`/api/ai/sessions/${sessionId}/messages/`);
}

export async function createSession(
  petId: number,
  query: string,
  promptId?: number,
): Promise<{ session: AIChatSession; message: AIChatMessage }> {
  const body: Record<string, unknown> = { pet_id: petId, query };
  if (promptId) body.system_prompt_id = promptId;

  return apiClient<{ session: AIChatSession; message: AIChatMessage }>('/api/ai/sessions/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteSession(id: number): Promise<void> {
  await apiClient<void>(`/api/ai/sessions/${id}/`, { method: 'DELETE' });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * Stream AI response via SSE (Server-Sent Events).
 * Uses raw fetch: SSE is text/event-stream, so apiClient's JSON parsing doesn't apply.
 */
export function streamResponse(
  sessionId: number,
  query: string,
  callbacks: {
    onToken: (token: string) => void;
    onDone: (messageId?: number) => void;
    onError: (error: string) => void;
  },
): AbortController {
  const controller = new AbortController();

  const run = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(
        `${API_URL}/api/ai/sessions/${sessionId}/stream/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Stream failed' }));
        callbacks.onError(err.error || 'Stream failed');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError('No response body');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                callbacks.onError(data.error);
                return;
              }
              if (data.done) {
                callbacks.onDone(data.message_id);
                return;
              }
              if (data.token) {
                callbacks.onToken(data.token);
              }
            } catch {
              // Skip malformed lines
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      callbacks.onError(err instanceof Error ? err.message : 'Stream error');
    }
  };

  run();
  return controller;
}