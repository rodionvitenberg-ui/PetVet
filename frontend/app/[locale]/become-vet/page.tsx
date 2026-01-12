'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Upload, FileText, CheckCircle, XCircle, Clock, ChevronLeft } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface VerificationRequest {
    id: number;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string;
    created_at: string;
}

export default function BecomeVetPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    
    const [request, setRequest] = useState<VerificationRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Загружаем текущий статус
    useEffect(() => {
        const fetchStatus = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/verification/current_status/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data) setRequest(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStatus();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreviewUrl(URL.createObjectURL(f));
        }
    };

    const handleSubmit = async () => {
        if (!file) return;
        setIsSubmitting(true);
        const token = localStorage.getItem('access_token');
        
        try {
            const formData = new FormData();
            formData.append('document_image', file);

            const res = await fetch(`${API_URL}/api/verification/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setRequest(data);
            } else {
                alert('Ошибка загрузки. Попробуйте файл меньшего размера.');
            }
        } catch (e) {
            console.error(e);
            alert('Ошибка сети');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition">
                    <ChevronLeft size={20} /> Назад
                </button>

                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Стать ветеринаром</h1>
                    <p className="text-gray-500 mb-8">
                        Для доступа к функциям врача нам необходимо подтвердить вашу квалификацию.
                    </p>

                    {/* СЦЕНАРИЙ 1: ЕСТЬ ЗАЯВКА */}
                    {request ? (
                        <div className="space-y-6">
                            {request.status === 'pending' && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
                                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Clock size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Заявка на проверке</h3>
                                    <p className="text-gray-600 mt-2">
                                        Мы проверяем ваши документы. Обычно это занимает до 24 часов. 
                                        Вам придет уведомление о решении.
                                    </p>
                                </div>
                            )}

                            {request.status === 'approved' && (
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Вы верифицированы!</h3>
                                    <p className="text-gray-600 mt-2">
                                        Ваш статус подтвержден. Вам доступны инструменты для работы с пациентами.
                                    </p>
                                    <button onClick={() => router.push('/dashboard')} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl font-bold">
                                        Перейти в кабинет
                                    </button>
                                </div>
                            )}

                            {request.status === 'rejected' && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <XCircle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Заявка отклонена</h3>
                                    <p className="text-gray-600 mt-2">
                                        К сожалению, мы не смогли подтвердить ваш статус.
                                    </p>
                                    {request.rejection_reason && (
                                        <div className="mt-4 p-3 bg-white rounded-xl text-sm font-medium text-red-600 border border-red-100">
                                            Причина: {request.rejection_reason}
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => { setRequest(null); setFile(null); setPreviewUrl(null); }} 
                                        className="mt-6 text-blue-600 font-bold hover:underline"
                                    >
                                        Попробовать снова
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* СЦЕНАРИЙ 2: НЕТ ЗАЯВКИ (ФОРМА) */
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
                                <div className="shrink-0 text-blue-500"><FileText size={24} /></div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Что нужно загрузить?</h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Фотографию или скан <b>диплома о ветеринарном образовании</b>. 
                                        Ваше имя в профиле должно совпадать с именем в документе.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className={`
                                    border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all
                                    ${file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
                                `}>
                                    {previewUrl ? (
                                        <div className="relative w-full h-48">
                                            <img src={previewUrl} className="w-full h-full object-contain rounded-xl" alt="Preview" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold opacity-0 hover:opacity-100 transition rounded-xl">
                                                Нажмите, чтобы изменить
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="text-gray-400 mb-3" size={40} />
                                            <span className="font-bold text-gray-700">Нажмите для загрузки фото</span>
                                            <span className="text-xs text-gray-400 mt-1">JPG, PNG до 5MB</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>

                                <button 
                                    onClick={handleSubmit} 
                                    disabled={!file || isSubmitting}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Отправляем...' : 'Отправить на проверку'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}