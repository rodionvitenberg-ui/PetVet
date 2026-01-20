'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function VerifyPage() {
    const searchParams = useSearchParams();
    
    // Состояния: 'loading' (ждем ответа), 'success' (активирован), 'error' (ошибка)
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Функция активации, вызывается один раз при загрузке
        const activateAccount = async () => {
            const uid = searchParams.get('uid');
            const token = searchParams.get('token');

            if (!uid || !token) {
                setStatus('error');
                setMessage('Некорректная ссылка активации. Проверьте адресную строку.');
                return;
            }

            try {
                const res = await fetch(`${API_URL}/api/auth/activate/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid, token })
                });

                const data = await res.json();

                if (res.ok) {
                    setStatus('success');
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Ссылка устарела или уже была использована.');
                }
            } catch (e) {
                setStatus('error');
                setMessage('Ошибка соединения с сервером. Попробуйте позже.');
            }
        };

        activateAccount();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center transition-all animate-in fade-in zoom-in duration-300">
                
                {/* 1. ЗАГРУЗКА */}
                {status === 'loading' && (
                    <div className="py-10">
                        <Loader2 className="animate-spin w-16 h-16 text-blue-500 mx-auto mb-6" />
                        <h2 className="text-xl font-bold text-gray-900">Активация аккаунта...</h2>
                        <p className="text-gray-500 mt-2">Пожалуйста, подождите</p>
                    </div>
                )}

                {/* 2. УСПЕХ */}
                {status === 'success' && (
                    <div className="py-6">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Успешно!</h2>
                        <p className="text-gray-500 mb-8">
                            Ваш аккаунт активирован. Теперь вы можете войти в систему и настроить профиль.
                        </p>
                        <Link 
                            href="/login" 
                            className="block w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                        >
                            Войти в аккаунт
                        </Link>
                    </div>
                )}

                {/* 3. ОШИБКА */}
                {status === 'error' && (
                    <div className="py-6">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ошибка активации</h2>
                        <p className="text-gray-600 mb-8 bg-red-50 p-4 rounded-xl text-sm border border-red-100">
                            {message}
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link href="/register" className="text-blue-600 font-bold hover:bg-blue-50 py-3 rounded-xl transition">
                                Зарегистрироваться заново
                            </Link>
                            <Link href="/login" className="text-gray-400 text-sm hover:text-gray-600">
                                Вернуться на главную
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}