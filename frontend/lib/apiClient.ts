const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface ApiClientOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { skipAuthRedirect = false, ...fetchOptions } = options;

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // FormData sets its own Content-Type with boundary, don't override it
  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_URL}/api/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('access_token', data.access);
            headers['Authorization'] = `Bearer ${data.access}`;
            const retryRes = await fetch(`${API_URL}${endpoint}`, {
              ...fetchOptions,
              headers,
            });
            if (retryRes.ok) return retryRes.json();
          } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            throw new Error('Session expired');
          }
        } catch {
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      } else {
        window.location.href = '/login';
        throw new Error('No refresh token');
      }
    }

    const errorData = await res.json().catch(() => ({}));

    // Parse Django Rest Framework error messages nicely
    const msg = Object.values(errorData).flat().join(', ');
    throw new Error(msg || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}