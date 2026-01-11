'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
    ShieldCheck, 
    AlertTriangle, 
    Loader2, 
    Stethoscope, 
    CheckCircle2, 
    ArrowRight 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function SharePage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const pathname = usePathname();
    const { isAuth, isLoading: isAuthLoading, user } = useAuth();

    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [petInfo, setPetInfo] = useState<{ id: number; name: string } | null>(null);

    // 1. Проверка авторизации
    useEffect(() => {
        if (!isAuthLoading && !isAuth) {
            // Если не авторизован — отправляем на логин, сохраняя текущий URL как returnUrl
            const returnUrl = encodeURIComponent(`${pathname}?token=${token}`);
            router.push(`/login?next=${returnUrl}`);
        }
    }, [isAuth, isAuthLoading, router, pathname, token]);

    // 2. Функция принятия доступа
    const handleAccept = async () => {
        if (!token) return;

        setStatus('processing');
        try {
            const authToken = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/api/pets/accept_access/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ token })
            });

            const data = await res.json();

            if (res.ok) {
                setPetInfo({ id: data.pet_id, name: data.pet_name });
                setStatus('success');
                // Через 2 секунды редирект в дашборд (или сразу к питомцу)
                setTimeout(() => {
                    router.push('/dashboard');
                }, 2000);
            } else {
                setErrorMessage(data.error || 'Неверный или просроченный токен.');
                setStatus('error');
            }
        } catch (error) {
            console.error(error);
            setErrorMessage('Ошибка соединения с сервером.');
            setStatus('error');
        }
    };

    // Если загружается состояние авторизации
    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    // Если нет токена
    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-gray-100">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Ошибка ссылки</h1>
                    <p className="text-gray-500 mb-6">Ссылка некорректна или отсутствует токен доступа.</p>
                    <button 
                        onClick={() => router.push('/')}
                        className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                    >
                        На главную
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 p-4 relative overflow-hidden">
            {/* Декоративный фон */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-600/10 to-transparent -z-10" />

            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden relative">
                
                {/* Верхняя часть (Хедер карточки) */}
                <div className="bg-blue-600 p-6 text-white text-center relative">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-3 shadow-inner ring-4 ring-white/10">
                            <Stethoscope size={32} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold">Ветеринарный доступ</h1>
                        <p className="text-blue-100 text-sm mt-1">Система обмена данными PetVet</p>
                    </div>
                </div>

                {/* Основной контент */}
                <div className="p-8">
                    
                    {status === 'idle' && (
                        <div className="text-center space-y-6">
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-left flex items-start gap-4">
                                <ShieldCheck className="text-blue-600 shrink-0 mt-1" size={24} />
                                <div>
                                    <h3 className="font-bold text-gray-900">Входящий запрос</h3>
                                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                        Владелец питомца предоставил вам временную ссылку для доступа к медицинской карте.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Вы вошли как</p>
                                <div className="font-medium text-gray-900 bg-gray-50 py-2 px-4 rounded-lg inline-block mx-auto border border-gray-200">
                                    {user?.email}
                                </div>
                            </div>

                            <button
                                onClick={handleAccept}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={20} />
                                Принять пациента
                            </button>
                            
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="text-gray-400 hover:text-gray-600 text-sm font-medium transition"
                            >
                                Отказаться и выйти
                            </button>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                            <Loader2 className="animate-spin text-blue-600" size={48} />
                            <h3 className="text-lg font-bold text-gray-900">Проверка доступа...</h3>
                            <p className="text-gray-500 text-sm">Пожалуйста, подождите, мы проверяем цифровую подпись.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle2 size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Доступ получен!</h2>
                            <p className="text-gray-600">
                                Вы успешно подключились к медкарте питомца <br />
                                <span className="font-bold text-gray-900 text-lg">"{petInfo?.name}"</span>
                            </p>
                            <div className="flex items-center gap-2 text-blue-600 text-sm font-bold mt-4 animate-pulse">
                                Переход в кабинет <ArrowRight size={14} />
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Ошибка доступа</h3>
                                <p className="text-gray-500 mt-2 text-sm">{errorMessage}</p>
                            </div>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                            >
                                Вернуться в дашборд
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}