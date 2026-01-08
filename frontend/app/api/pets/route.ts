import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/pets/ (Список) и POST /api/pets/ (Создание)
export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');
  if (!accessToken) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  // Важно: Django адрес со слэшем
  const res = await fetch('http://127.0.0.1:8000/api/pets/', {
    headers: { 'Authorization': `Bearer ${accessToken.value}` },
    cache: 'no-store'
  });
  
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');
  if (!accessToken) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  const contentType = request.headers.get('content-type') || '';
  let body;
  const headers: Record<string, string> = { 'Authorization': `Bearer ${accessToken.value}` };

  if (contentType.includes('application/json')) {
      body = JSON.stringify(await request.json());
      headers['Content-Type'] = 'application/json';
  } else {
      body = await request.formData();
  }

  const res = await fetch('http://127.0.0.1:8000/api/pets/', {
    method: 'POST',
    headers,
    body: body as any
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}