// frontend/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;
  
  const djangoUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  try {
    const res = await fetch(`${djangoUrl}/api/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ detail: data.detail || 'Ошибка входа' }, { status: res.status });
    }

    // Устанавливаем куки
    const cookieStore = await cookies();
    
    // Access Token
    cookieStore.set('access_token', data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 день
      path: '/',
      sameSite: 'lax',
    });

    // Refresh Token
    cookieStore.set('refresh_token', data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ detail: 'Ошибка сервера Next.js' }, { status: 500 });
  }
}