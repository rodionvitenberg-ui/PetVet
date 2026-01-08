import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;
  
  // Используем 127.0.0.1 чтобы избежать проблем с localhost
  const djangoUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  console.log(`[Login] Попытка входа для: ${username} на ${djangoUrl}/api/token/`);

  try {
    // ВАЖНО: В твоем urls.py путь именно 'api/token/', без 'auth'
    const res = await fetch(`${djangoUrl}/api/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Login] Ошибка от Django:', data);
      return NextResponse.json(
        { detail: data.detail || 'Ошибка входа' }, 
        { status: res.status }
      );
    }

    // Устанавливаем куки
    const cookieStore = await cookies();
    
    // Access Token (живет недолго, например 1 день)
    cookieStore.set('access_token', data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 день
      path: '/',
      sameSite: 'lax',
    });

    // Refresh Token (живет дольше, например 7 дней)
    cookieStore.set('refresh_token', data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Login] Критическая ошибка:', error);
    return NextResponse.json({ detail: 'Ошибка сервера Next.js' }, { status: 500 });
  }
}