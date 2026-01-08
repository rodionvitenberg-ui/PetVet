import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  // 1. Достаем куку на сервере Next.js (здесь это можно)
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');

  // Если куки нет — значит, пользователь не залогинен
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const djangoUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  try {
    // 2. Идем в Django с этим токеном
    // Обрати внимание: путь /api/auth/me/, который мы только что настроили в Django
    const res = await fetch(`${djangoUrl}/api/auth/me/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      // Токен может быть протухшим или невалидным
      return NextResponse.json({ error: 'Token invalid' }, { status: 401 });
    }

    // 3. Возвращаем данные пользователя (id, username, avatar...) фронтенду
    const userData = await res.json();
    return NextResponse.json(userData);

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}