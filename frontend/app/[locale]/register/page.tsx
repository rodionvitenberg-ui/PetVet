'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'; // Добавил Loader2
import { addToast } from "@heroui/toast"; // <--- Подключаем тоасты

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  
  // Состояния UI
  const [isSuccess, setIsSuccess] = useState(false); // Письмо отправлено
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Валидация на клиенте
    if (formData.password !== formData.confirm_password) {
      const msg = 'Пароли не совпадают';
      setError(msg);
      addToast({ title: "Ошибка", description: msg, color: "danger", variant: "flat" });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password
            // is_veterinarian не отправляем, роль получается позже
        })
      });

      const data = await res.json();

      if (!res.ok) {
        // Парсим ошибки от DRF
        const errorMsg = typeof data === 'object' 
            ? Object.values(data).flat().join(', ') 
            : 'Ошибка регистрации';
        throw new Error(errorMsg);
      }

      // УСПЕХ
      addToast({ 
          title: "Аккаунт создан!", 
          description: "Проверьте почту для активации", 
          color: "success", 
          variant: "flat" 
      });
      setIsSuccess(true);

    } catch (err: any) {
      const msg = err.message || 'Произошла ошибка';
      setError(msg);
      addToast({ title: "Ошибка регистрации", description: msg, color: "danger", variant: "flat" });
    } finally {
      setLoading(false);
    }
  };

  // === ЭКРАН УСПЕХА (CHECK EMAIL) ===
  if (isSuccess) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl text-center border border-gray-100 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Проверьте почту</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    Мы отправили ссылку для активации на <br/>
                    <span className="font-bold text-gray-800">{formData.email}</span>. 
                    <br/>Перейдите по ней, чтобы завершить регистрацию.
                </p>
                <div className="space-y-4">
                    <Link href="/login" className="text-blue-600 font-bold hover:bg-blue-50 py-3 px-6 rounded-xl transition flex items-center justify-center gap-2">
                        Вернуться к входу <ArrowRight size={18}/>
                    </Link>
                </div>
            </div>
        </div>
      );
  }

  // === ФОРМА РЕГИСТРАЦИИ ===
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Регистрация
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 transition">
            Войти
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-100 sm:rounded-3xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Оставляем inline-ошибку тоже, это хороший тон для форм */}
            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-start gap-2 animate-in slide-in-from-top-2">
                    <span className="font-bold">Ошибка:</span> {error}
                </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Никнейм</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400"/>
                </div>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="block w-full pl-10 px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition sm:text-sm"
                  placeholder="Придумайте логин"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400"/>
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="block w-full pl-10 px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition sm:text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Пароль</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={18} className="text-gray-400"/>
                        </div>
                        <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="block w-full pl-10 px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition sm:text-sm"
                            placeholder="******"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Подтверждение</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={18} className="text-gray-400"/>
                        </div>
                        <input
                            type="password"
                            required
                            value={formData.confirm_password}
                            onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                            className="block w-full pl-10 px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition sm:text-sm"
                            placeholder="******"
                        />
                    </div>
                </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Зарегистрироваться'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}