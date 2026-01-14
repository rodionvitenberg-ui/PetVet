'use client';

import { useState, Suspense } from 'react'; // Suspense нужен для useSearchParams в Next 13+
import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // <--- 1. Импорт для чтения URL
// import { useAuth } from '@/components/providers/AuthProvider'; // Можно убрать, если делаем хард-рефреш
import { GoogleLogin } from '@react-oauth/google';

// Выносим контент формы в отдельный компонент, чтобы обернуть его в Suspense
// (Это требование Next.js при использовании useSearchParams)
function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const searchParams = useSearchParams(); // <--- 2. Хук для параметров
  const returnUrl = searchParams.get('returnUrl'); // <--- 3. Ловим "хвост"

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // Функция для жесткого редиректа
  const handleHardRedirect = () => {
      // Куда идем? Если был хвост - туда, иначе в дашборд
      const target = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
      // БРУТФОРС: Полная перезагрузка страницы
      window.location.href = target; 
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error('Неверный логин или пароль');
      const data = await res.json();
      
      // Мы НЕ вызываем loginSuccess, чтобы избежать гонки состояний.
      // Сначала сохраняем токены физически:
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      // Теперь делаем хард-рефреш. 
      // При перезагрузке AuthProvider сам найдет токены и обновит стейт.
      handleHardRedirect();
      
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
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
              type="text" required
              value={username} onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
            Войти
          </button>
        </form>

        <div className="my-4 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">или</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <div className="flex justify-center">
             <GoogleLogin
                onSuccess={async (credentialResponse) => {
                    try {
                        const res = await fetch(`${API_URL}/api/auth/google/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: credentialResponse.credential }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error("Google auth failed");
                        
                        // Сохраняем токены
                        localStorage.setItem('access_token', data.tokens.access);
                        localStorage.setItem('refresh_token', data.tokens.refresh);

                        if (data.is_new_user) {
                           // Для новых - всегда на онбординг
                           window.location.href = '/onboarding';
                        } else {
                           // Для старых - туда, откуда пришли
                           handleHardRedirect();
                        }
                    } catch (e) {
                        setError("Ошибка авторизации через Google");
                    }
                }}
                onError={() => setError('Ошибка подключения к Google')}
                useOneTap
            />
        </div>

        <div className="mt-4 text-center text-sm">
          <span className="text-gray-600">Нет аккаунта? </span>
          <Link href="/register" className="text-blue-600 hover:underline">Зарегистрироваться</Link>
        </div>
      </div>
  );
}

// Оборачиваем в Suspense, чтобы Next.js не ругался при билде на useSearchParams
export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[url('/bg/bg1.jpg')] bg-cover bg-center bg-no-repeat bg-fixed">
            <Suspense fallback={<div className="bg-white p-8 rounded-xl shadow-md">Загрузка...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}