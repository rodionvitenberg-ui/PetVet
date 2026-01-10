'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<'owner' | 'vet'>('owner');
  const [details, setDetails] = useState({ city: '', clinic_name: '' });
  // Добавляем стейт для паролей
  const [passwords, setPasswords] = useState({ password: '', confirm_password: '' }); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const handleSubmit = async () => {
    setError('');
    
    // Валидация пароля (если пользователь решил его ввести)
    if (passwords.password || passwords.confirm_password) {
        if (passwords.password !== passwords.confirm_password) {
            setError('Пароли не совпадают');
            return;
        }
        if (passwords.password.length < 6) {
             setError('Пароль слишком короткий');
             return;
        }
    }

    setLoading(true);
    const token = localStorage.getItem('access_token');
    
    try {
      const body: any = {
        role: role,
        ...(role === 'vet' ? details : {}),
      };

      // Добавляем пароль в запрос только если он заполнен
      if (passwords.password) {
        body.password = passwords.password;
      }

      const res = await fetch(`${API_URL}/api/auth/me/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push('/'); 
        router.refresh();
      } else {
        const errData = await res.json();
        // Пытаемся красиво вывести ошибку от Django
        const msg = Object.values(errData).flat().join(', ') || 'Ошибка сохранения данных';
        setError(msg);
      }
    } catch (e) {
        console.error(e);
        setError('Сетевая ошибка');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Добро пожаловать! 👋</h1>
        <p className="text-gray-600 mb-6 text-center">Настройте свой профиль для начала работы</p>

        {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center">
                {error}
            </div>
        )}

        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Выберите роль:</label>
            <div className="grid grid-cols-2 gap-4">
                <div 
                    onClick={() => setRole('owner')}
                    className={`cursor-pointer border-2 rounded-xl p-4 text-center transition ${
                        role === 'owner' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                >
                    <div className="text-3xl mb-1">🐱</div>
                    <div className="font-bold text-gray-700">Владелец</div>
                </div>

                <div 
                    onClick={() => setRole('vet')}
                    className={`cursor-pointer border-2 rounded-xl p-4 text-center transition ${
                        role === 'vet' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                    }`}
                >
                    <div className="text-3xl mb-1">👨‍⚕️</div>
                    <div className="font-bold text-gray-700">Ветеринар</div>
                </div>
            </div>
        </div>

        {/* Секция данных Ветеринара */}
        {role === 'vet' && (
            <div className="bg-green-50 p-4 rounded-lg mb-6 border border-green-100 animate-fade-in">
                <h3 className="text-green-800 font-semibold mb-3 text-sm">Данные специалиста</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Город</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded p-2 text-sm text-black"
                            placeholder="Москва"
                            value={details.city}
                            onChange={(e) => setDetails({...details, city: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Название клиники</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded p-2 text-sm text-black"
                            placeholder="ВетКлиника №1"
                            value={details.clinic_name}
                            onChange={(e) => setDetails({...details, clinic_name: e.target.value})}
                        />
                    </div>
                </div>
            </div>
        )}

        {/* Секция Пароля */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
            <h3 className="text-gray-800 font-semibold mb-1 text-sm">Создайте пароль</h3>
            <p className="text-xs text-gray-500 mb-3">Это необязательно, но позволит вам входить без Google.</p>
            <div className="space-y-3">
                <input 
                    type="password" 
                    className="w-full border border-gray-300 rounded p-2 text-sm text-black"
                    placeholder="Новый пароль"
                    value={passwords.password}
                    onChange={(e) => setPasswords({...passwords, password: e.target.value})}
                />
                <input 
                    type="password" 
                    className="w-full border border-gray-300 rounded p-2 text-sm text-black"
                    placeholder="Подтвердите пароль"
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})}
                />
            </div>
        </div>

        <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-md"
        >
            {loading ? 'Сохранение...' : 'Завершить настройку'}
        </button>
      </div>
    </div>
  );
}