import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Определяем тип для params (Next.js 15 требует Promise)
type Props = {
  params: Promise<{ id: string }>;
};

// Универсальная функция-прокси
async function proxyRequest(request: NextRequest, id: string) {
  // 1. Проверяем токен
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');
  
  if (!accessToken) {
    console.warn(`[API Pets/${id}] Нет токена`);
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  // 2. Формируем URL к Django (ОБЯЗАТЕЛЬНО СО СЛЭШЕМ В КОНЦЕ)
  const djangoUrl = `http://127.0.0.1:8000/api/pets/${id}/`;
  
  console.log(`[API Pets/${id}] ${request.method} -> ${djangoUrl}`);

  try {
    // 3. Готовим заголовки
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken.value}`,
    };
    
    // Передаем Content-Type, если это не GET/DELETE
    const reqContentType = request.headers.get('content-type');
    if (request.method !== 'GET' && request.method !== 'DELETE' && reqContentType) {
        if (reqContentType.includes('application/json')) {
             headers['Content-Type'] = 'application/json';
        }
        // Для multipart/form-data заголовок Content-Type НЕ ставим, fetch сделает это сам с boundary
    }

    // 4. Готовим тело
    let body = undefined;
    if (request.method !== 'GET' && request.method !== 'DELETE') {
         if (reqContentType?.includes('application/json')) {
             body = JSON.stringify(await request.json());
         } else if (reqContentType?.includes('multipart/form-data')) {
             body = await request.formData();
         }
    }

    // 5. Делаем запрос
    const res = await fetch(djangoUrl, {
      method: request.method,
      headers: headers,
      body: body as any,
      cache: 'no-store', // Всегда свежие данные
    });

    // 6. Читаем ответ
    // Используем text(), чтобы не упасть, если вернется пустота или HTML ошибки
    const responseText = await res.text();
    
    let data;
    try {
        data = JSON.parse(responseText);
    } catch {
        data = {}; // Если пусто или не JSON
    }

    if (!res.ok) {
        console.error(`[API Pets/${id}] Ошибка Django (${res.status}):`, responseText.substring(0, 200));
    }

    return NextResponse.json(data, { status: res.status });

  } catch (error) {
    console.error(`[API Pets/${id}] CRITICAL ERROR:`, error);
    return NextResponse.json({ detail: 'Proxy Error' }, { status: 500 });
  }
}

// Экспортируем методы
export async function GET(req: NextRequest, { params }: Props) {
  return proxyRequest(req, (await params).id);
}

export async function PATCH(req: NextRequest, { params }: Props) {
  return proxyRequest(req, (await params).id);
}

export async function DELETE(req: NextRequest, { params }: Props) {
  return proxyRequest(req, (await params).id);
}