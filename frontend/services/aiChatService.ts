import { AIChatSession, AIChatMessage, SystemPrompt } from '@/types/ai-chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchPrompts(): Promise<SystemPrompt[]> {
  const res = await fetch(`${API_URL}/api/ai/prompts/`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch prompts');
  return res.json();
}

export async function fetchSessions(petId?: number): Promise<AIChatSession[]> {
  const params = petId ? `?pet_id=${petId}` : '';
  const res = await fetch(`${API_URL}/api/ai/sessions/list/${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function fetchMessages(sessionId: number): Promise<AIChatMessage[]> {
  const res = await fetch(`${API_URL}/api/ai/sessions/${sessionId}/messages/`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function createSession(
  petId: number,
  query: string,
  promptId?: number,
): Promise<{ session: AIChatSession; message: AIChatMessage }> {
  const body: Record<string, unknown> = { pet_id: petId, query };
  if (promptId) body.system_prompt_id = promptId;

  const res = await fetch(`${API_URL}/api/ai/sessions/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to create session');
  }
  return res.json();
}

export async function deleteSession(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/ai/sessions/${id}/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete session');
}

/**
 * Stream AI response via SSE (Server-Sent Events).
 * Returns an object with:
 * - readableStream: ReadableStream of chunks
 * - onToken: callback for each token
 * - onDone: callback when complete with message_id
 * - onError: callback on error
 * - abort: function to cancel
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
      const token = getToken();
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