// frontend/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  
  // 1. Отправляем запрос в Django
  // Используем переменную окружения или localhost по умолчанию
  const djangoUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  
  const res = await fetch(`${djangoUrl}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  // 2. Создаем ответ
  const response = NextResponse.json({ success: true });

  // 3. Устанавливаем HttpOnly Cookies
  // Access Token (живет недолго, например 30 мин)
  response.cookies.set('access_token', data.access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // True только на HTTPS
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 30, // 30 минут
  });

  // Refresh Token (живет долго, например 7 дней)
  response.cookies.set('refresh_token', data.refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  });

  return response;
}