'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Импортируем наш хук авторизации
import { useAuth } from '@/components/providers/AuthProvider';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // 1. Получаем состояние из AuthProvider
  const { isAuth, isLoading } = useAuth();

  // 2. Эффект для редиректа авторизованных пользователей
  useEffect(() => {
    // Если проверка прошла и мы авторизованы — кидаем на главную
    if (!isLoading && isAuth) {
      router.push('/');
    }
  }, [isAuth, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})); 
        throw new Error(data.detail || 'Неверный логин или пароль');
      }

      // При успехе:
      // router.refresh() обновляет серверные компоненты (чтобы Middleware увидел куки)
      router.refresh(); 
      router.push('/');
      
      // В редких случаях, если router.push не срабатывает мгновенно, 
      // можно использовать window.location.href = '/'
      
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 3. Предотвращаем мелькание формы, пока проверяем статус
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">
        Загрузка...
      </div>
    );
  }

  // Если пользователя уже редиректит эффект, форму тоже можно не показывать
  if (isAuth) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Вход в PetVet</h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}