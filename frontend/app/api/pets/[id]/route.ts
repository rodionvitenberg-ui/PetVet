import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type Props = {
  params: Promise<{ id: string }>;
};

// Функция-помощник для проксирования
async function proxyRequest(request: NextRequest, id: string) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');
  if (!accessToken) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  const djangoUrl = `http://127.0.0.1:8000/api/pets/${id}/`;

  const headers: Record<string, string> = { 'Authorization': `Bearer ${accessToken.value}` };
  const contentType = request.headers.get('content-type');
  
  let body;
  if (request.method !== 'GET' && request.method !== 'DELETE') {
      if (contentType?.includes('application/json')) {
          body = JSON.stringify(await request.json());
          headers['Content-Type'] = 'application/json';
      } else if (contentType?.includes('multipart/form-data')) {
          body = await request.formData();
      }
  }

  const res = await fetch(djangoUrl, {
    method: request.method,
    headers,
    body: body as any,
    cache: 'no-store'
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

// GET (Детали)
export async function GET(req: NextRequest, { params }: Props) {
  return proxyRequest(req, (await params).id);
}

// PATCH (Редактирование)
export async function PATCH(req: NextRequest, { params }: Props) {
  return proxyRequest(req, (await params).id);
}

// DELETE (Удаление)
export async function DELETE(req: NextRequest, { params }: Props) {
  return proxyRequest(req, (await params).id);
}