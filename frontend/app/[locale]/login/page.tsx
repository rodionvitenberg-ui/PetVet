'use client';

import { useState } from 'react';
// import { useRouter } from 'next/navigation'; <-- Убираем router отсюда, он теперь внутри loginSuccess
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider'; // <-- Импортируем хук
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Достаем функцию из контекста
  const { loginSuccess } = useAuth(); 
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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

      // Вместо localStorage.setItem и router.push вручную, мы:
      // 1. Делаем запрос за данными юзера (потому что /api/token/ возвращает только токены, а не профиль)
      // Либо, если ты уверен, что хочешь быстрее - можно просто обновить токены и вызвать checkAuth.
      // Но самый надежный способ - сразу загрузить юзера.
      
      // В твоем старом коде RegisterView возвращал объект { user: {...}, tokens: {...} }
      // Но стандартный SimpleJWT /api/token/ возвращает ТОЛЬКО токены.
      // Поэтому нам нужно сделать еще один запрос, чтобы получить User для обновления контекста.
      
      const userRes = await fetch(`${API_URL}/api/auth/me/`, {
          headers: { 'Authorization': `Bearer ${data.access}` }
      });
      const userData = await userRes.json();
      
      // Вызываем обновление контекста
      loginSuccess(userData, data.access, data.refresh);
      
    } catch (err: any) {
      setError(err.message);
    }
  };

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
                        
                        // Если это НОВЫЙ юзер, у него еще может не быть роли.
                        // Но наш бэкенд GoogleLoginView возвращает сразу { user, tokens, is_new_user }
                        // Так что тут удобно!
                        
                        if (data.is_new_user) {
                           // Для онбординга можно просто сохранить токены и редиректнуть
                           localStorage.setItem('access_token', data.tokens.access);
                           localStorage.setItem('refresh_token', data.tokens.refresh);
                           window.location.href = '/onboarding'; // Тут можно жесткий редирект
                        } else {
                           // А тут обновляем контекст
                           loginSuccess(data.user, data.tokens.access, data.tokens.refresh);
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
    </div>
  );
}