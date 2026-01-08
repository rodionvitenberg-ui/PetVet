import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Принудительно используем 127.0.0.1 если не задано иное, так как localhost может сбоить в Node
  const djangoUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  try {
    // Добавляем контроллер отмены для таймаута (например, 3 секунды)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${djangoUrl}/api/auth/me/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal, // Подключаем сигнал
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ error: 'Token invalid' }, { status: 401 });
    }

    const userData = await res.json();
    return NextResponse.json(userData);

  } catch (error) {
    console.error('Server Fetch Error:', error);
    // Важно вернуть ответ, чтобы фронтенд разблокировался
    return NextResponse.json({ error: 'Server unavailable' }, { status: 500 });
  }
}