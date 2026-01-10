'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'owner', // 'owner' | 'vet'
    clinic_name: '',
    city: ''
  });
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        // Пытаемся достать первую ошибку из ответа Django
        const firstError = Object.values(data).flat()[0] as string;
        throw new Error(firstError || 'Ошибка регистрации');
      }

      // Сразу сохраняем токены и логиним пользователя
      localStorage.setItem('access_token', data.tokens.access);
      localStorage.setItem('refresh_token', data.tokens.refresh);

      router.push('/'); 
      router.refresh();

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Регистрация</h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Роль */}
          <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
            <button
              type="button"
              onClick={() => setFormData({...formData, role: 'owner'})}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                formData.role === 'owner' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
              }`}
            >
              Я Владелец 🐱
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, role: 'vet'})}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                formData.role === 'vet' ? 'bg-white shadow text-green-600' : 'text-gray-500'
              }`}
            >
              Я Врач 👨‍⚕️
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Логин (Username)</label>
            <input name="username" type="text" required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
              onChange={handleChange} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input name="email" type="email" required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
              onChange={handleChange} />
          </div>

          {/* Доп поля для Врача */}
          {formData.role === 'vet' && (
            <div className="bg-green-50 p-3 rounded-lg space-y-3 border border-green-100">
              <p className="text-xs text-green-700 font-semibold mb-2">Данные специалиста</p>
              <div>
                <label className="block text-sm font-medium text-gray-700">Город</label>
                <input name="city" type="text" required
                  placeholder="Москва"
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                  onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Клиника</label>
                <input name="clinic_name" type="text" required
                  placeholder="ВетКлиника №1"
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                  onChange={handleChange} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Пароль</label>
              <input name="password" type="password" required
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Повтор</label>
              <input name="confirm_password" type="password" required
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                onChange={handleChange} />
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
            Создать аккаунт
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <span className="text-gray-600">Уже есть аккаунт? </span>
          <Link href="/login" className="text-blue-600 hover:underline">Войти</Link>
        </div>
      </div>
    </div>
  );
}