'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, updateUser } = useAuth(); // Используем updateUser для обновления контекста после сохранения
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    city: '',
    clinic_name: '',
    email: '', // Read-only
  });

  // Состояние паролей
  const [passwords, setPasswords] = useState({
    password: '',
    confirm_password: ''
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // Заполняем форму данными из контекста при загрузке
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: (user as any).phone || '', // TypeScript может ругаться, если в интерфейсе нет phone
        city: (user as any).city || '',
        clinic_name: (user as any).clinic_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Обработчик клика по аватарке
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Обработчик выбора файла
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Сразу загружаем аватарку
    const uploadData = new FormData();
    uploadData.append('avatar', file);

    try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/api/auth/me/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`, 
                // Content-Type НЕ указываем, браузер сам поставит multipart/form-data boundary
            },
            body: uploadData
        });

        if (!res.ok) throw new Error('Ошибка загрузки фото');
        
        const updatedUser = await res.json();
        // Обновляем контекст, чтобы аватарка обновилась в хедере
        updateUser(updatedUser);
        setMessage({ type: 'success', text: 'Фото обновлено!' });
        
    } catch (err) {
        setMessage({ type: 'error', text: 'Не удалось загрузить фото' });
    } finally {
        setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
        const token = localStorage.getItem('access_token');
        
        // Формируем payload. Если пароли введены - добавляем их.
        const payload: any = { ...formData };
        delete payload.email; // Email менять нельзя

        if (passwords.password) {
            if (passwords.password !== passwords.confirm_password) {
                setMessage({ type: 'error', text: 'Пароли не совпадают' });
                setLoading(false);
                return;
            }
            if (passwords.password.length < 6) {
                setMessage({ type: 'error', text: 'Пароль слишком короткий' });
                setLoading(false);
                return;
            }
            payload.password = passwords.password;
        }

        const res = await fetch(`${API_URL}/api/auth/me/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Ошибка сохранения');

        const updatedUser = await res.json();
        updateUser(updatedUser);
        setMessage({ type: 'success', text: 'Профиль сохранен!' });
        setPasswords({ password: '', confirm_password: '' }); // Очищаем поля пароля

    } catch (err) {
        setMessage({ type: 'error', text: 'Ошибка при сохранении данных' });
    } finally {
        setLoading(false);
    }
  };

  if (!user) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Настройки профиля</h1>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* ЛЕВАЯ КОЛОНКА: Аватар и статус */}
        <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="relative inline-block group cursor-pointer" onClick={handleAvatarClick}>
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 mx-auto shadow-inner relative">
                        {user.avatar ? (
                            <img 
                                src={user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-blue-100 flex items-center justify-center text-4xl">
                                👤
                            </div>
                        )}
                        {/* Оверлей при наведении */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">Изменить</span>
                        </div>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>
                
                <h2 className="mt-4 text-xl font-bold text-gray-800">{user.username}</h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
                
                <div className="mt-4 flex justify-center gap-2">
                    {user.is_veterinarian ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                            Ветеринар 👨‍⚕️
                        </span>
                    ) : (
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                            Владелец 🐱
                        </span>
                    )}
                    {/* Если врач верифицирован */}
                    {user.is_veterinarian && (user as any).is_verified && (
                         <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200" title="Документы проверены">
                            Verified ✅
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Форма */}
        <div className="md:col-span-2 space-y-6">
            
            {/* Основные данные */}
            <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Личные данные</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            value={formData.first_name}
                            onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            value={formData.last_name}
                            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            value={formData.city}
                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="+7 (999) 000-00-00"
                        />
                    </div>
                </div>

                {user.is_veterinarian && (
                    <div className="mb-4 bg-green-50 p-4 rounded-lg border border-green-100">
                         <label className="block text-sm font-medium text-green-800 mb-1">Место работы (Клиника)</label>
                         <input 
                            type="text" 
                            className="w-full border border-green-300 rounded-lg p-2.5 text-black focus:ring-2 focus:ring-green-500 outline-none transition"
                            value={formData.clinic_name}
                            onChange={(e) => setFormData({...formData, clinic_name: e.target.value})}
                        />
                    </div>
                )}

                {/* Секция Безопасности */}
                <div className="mt-8 pt-6 border-t">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Безопасность</h3>
                    <p className="text-sm text-gray-500 mb-4">Оставьте поля пустыми, если не хотите менять пароль.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Новый пароль</label>
                            <input 
                                type="password" 
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-black focus:ring-2 focus:ring-blue-500 outline-none"
                                value={passwords.password}
                                onChange={(e) => setPasswords({...passwords, password: e.target.value})}
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Подтверждение</label>
                            <input 
                                type="password" 
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-black focus:ring-2 focus:ring-blue-500 outline-none"
                                value={passwords.confirm_password}
                                onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-md disabled:opacity-50"
                    >
                        {loading ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </div>

            </form>
        </div>
      </div>
    </div>
  );
}