// frontend/lib/apiClient.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function apiRequest(
  endpoint: string,
  locale: string,
  options: RequestInit = {},
  token?: string | null
) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  headers.set('Accept-Language', locale);
  
  // FormData (для картинок) сама устанавливает правильный Content-Type с boundary
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Красивый парсинг ошибок от Django Rest Framework
    const msg = Object.values(errorData).flat().join(', ');
    throw new Error(msg || errorData.detail || errorData.message || `Ошибка: ${response.status}`);
  }

  return response.json();
}