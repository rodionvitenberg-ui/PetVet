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
        <div className="min-h-screen flex items-center justify-center bg-muted p-4">
            <div className="bg-card p-8 rounded-3xl shadow-xl border border-border max-w-md w-full text-center transition-all animate-in fade-in zoom-in duration-300">
                
                {/* 1. ЗАГРУЗКА */}
                {status === 'loading' && (
                    <div className="py-10">
                        <Loader2 className="animate-spin w-16 h-16 text-primary mx-auto mb-6" />
                        <h2 className="text-xl font-bold text-foreground">Activating account...</h2>
                        <p className="text-muted-foreground mt-2">Please wait</p>
                    </div>
                )}

                {/* 2. УСПЕХ */}
                {status === 'success' && (
                    <div className="py-6">
                        <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Successfully!</h2>
                        <p className="text-muted-foreground mb-8">
                            Your account has been activated. You can now log in to the system and configure your profile.
                        </p>
                        <Link 
                            href="/login" 
                            className="block w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary transition shadow-lg shadow-primary/20"
                        >
                            Log in to your account
                        </Link>
                    </div>
                )}

                {/* 3. ОШИБКА */}
                {status === 'error' && (
                    <div className="py-6">
                        <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Activation Error</h2>
                        <p className="text-muted-foreground mb-8 bg-destructive/10 p-4 rounded-xl text-sm border border-destructive/20">
                            {message}
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link href="/register" className="text-primary font-bold hover:bg-primary/10 py-3 rounded-xl transition">
                                Register again
                            </Link>
                            <Link href="/login" className="text-muted-foreground text-sm hover:text-muted-foreground">
                                Return to homepage
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}