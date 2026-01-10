'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Stethoscope, 
  AlertTriangle, CheckCircle, Info, 
  FileText, Activity, AlertCircle
} from 'lucide-react';

interface AIConsultModalProps {
  isOpen: boolean;
  onClose: () => void;
  petId: number; // <--- [ВАЖНО] Добавили ID, нужен для запроса
  petName: string;
  petSpecies: string; 
  query: string;
}

interface AIResponse {
    urgency: 'low' | 'medium' | 'high';
    title: string;
    content: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function AIConsultModal({ isOpen, onClose, petId, petName, petSpecies, query }: AIConsultModalProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [responseData, setResponseData] = useState<AIResponse | null>(null);

  useEffect(() => {
    if (isOpen && petId) {
      setStatus('loading');
      setResponseData(null);
      
      const fetchAI = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/api/ai/consult/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pet_id: petId,
                    query: query
                })
            });

            if (res.ok) {
                const data = await res.json();
                setResponseData(data);
                setStatus('success');
            } else {
                console.error("AI Error:", await res.text());
                setStatus('error');
            }
        } catch (e) {
            console.error("Network Error:", e);
            setStatus('error');
        }
      };

      fetchAI();
    }
  }, [isOpen, petId, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
           <div className="flex items-center gap-3">
              <div className="bg-[#FFCBA4] p-2 rounded-full">
                <Sparkles size={20} className="text-black/80" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 leading-none">Вет-Ассистент</h2>
                <p className="text-xs text-gray-500 mt-1 font-medium">Анализ для: {petName}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
               <X size={20} />
           </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-0 relative">
            
            {/* СОСТОЯНИЕ 1: ЗАГРУЗКА */}
            {status === 'loading' && (
                <div className="flex flex-col items-center justify-center h-80 space-y-6 p-10 text-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Stethoscope size={24} className="text-blue-500 animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 animate-pulse">Анализирую медицинскую карту...</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                            Проверяю историю болезней, аллергии и последние вакцинации {petName}.
                        </p>
                    </div>
                </div>
            )}

             {/* СОСТОЯНИЕ 3: ОШИБКА */}
             {status === 'error' && (
                <div className="flex flex-col items-center justify-center h-80 space-y-4 p-10 text-center text-red-500">
                    <AlertTriangle size={48} />
                    <h3 className="text-lg font-bold">Не удалось получить ответ</h3>
                    <p className="text-sm text-gray-600">
                        Возможно, сервер перегружен или неверный ключ API. Попробуйте позже.
                    </p>
                </div>
            )}

            {/* СОСТОЯНИЕ 2: ОТВЕТ ГОТОВ (SUCCESS) */}
            {status === 'success' && responseData && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Статус бар */}
                    <div className={`
                        px-6 py-4 flex items-center gap-4
                        ${responseData.urgency === 'high' ? 'bg-red-50 border-b border-red-100' : 
                          responseData.urgency === 'medium' ? 'bg-amber-50 border-b border-amber-100' : 
                          'bg-emerald-50 border-b border-emerald-100'}
                    `}>
                        <div className={`
                            p-2 rounded-full shrink-0
                            ${responseData.urgency === 'high' ? 'bg-red-100 text-red-600' : 
                              responseData.urgency === 'medium' ? 'bg-amber-100 text-amber-600' : 
                              'bg-emerald-100 text-emerald-600'}
                        `}>
                            {responseData.urgency === 'high' ? <AlertTriangle size={24} /> : 
                             responseData.urgency === 'medium' ? <Activity size={24} /> : 
                             <CheckCircle size={24} />}
                        </div>
                        <div>
                            <h4 className={`font-bold text-sm uppercase tracking-wide
                                ${responseData.urgency === 'high' ? 'text-red-700' : 
                                  responseData.urgency === 'medium' ? 'text-amber-700' : 
                                  'text-emerald-700'}
                            `}>
                                {responseData.urgency === 'high' ? 'Требуется внимание врача' : 
                                 responseData.urgency === 'medium' ? 'Наблюдайте за состоянием' : 
                                 'Показатели в норме'}
                            </h4>
                            <p className="text-sm text-gray-700 font-medium leading-tight mt-0.5">
                                {responseData.title}
                            </p>
                        </div>
                    </div>

                    {/* Текст ответа */}
                    <div className="p-6 space-y-4">
                        <div className="prose prose-sm max-w-none text-gray-700 bg-white">
                            <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
                                {responseData.content}
                            </p>
                        </div>
                        
                        {/* Дисклеймер */}
                        <div className="flex gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 mt-6">
                            <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-500 leading-relaxed">
                                <span className="font-bold text-gray-700">Важно:</span> Я — искусственный интеллект. Мои рекомендации основаны на статистике и не заменяют очного осмотра ветеринара. Если состояние питомца ухудшается, немедленно обратитесь в клинику.
                            </p>
                        </div>
                    </div>

                    {/* Действия */}
                    <div className="p-6 pt-0 flex gap-3">
                         <button className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                            <FileText size={18} />
                            Сохранить в заметки
                         </button>
                         <button 
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition"
                         >
                            Понятно
                         </button>
                    </div>

                </div>
            )}

        </div>
      </div>
    </div>
  );
}