'use client';

import React, { useState } from 'react';
import { X, Cat, Dog, Rabbit, Fish, Check } from 'lucide-react'; // Убедись, что иконки есть

interface CreatePetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Чтобы обновить список после создания
}

export default function CreatePetModal({ isOpen, onClose, onSuccess }: CreatePetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Данные формы
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [categorySlug, setCategorySlug] = useState(''); // Пока просто слаг (cat/dog)
  const [birthDate, setBirthDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Валидация
    if (!name || !gender || !categorySlug) {
      setError('Заполните обязательные поля (Имя, Вид, Пол)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      
      // ВАЖНО: В реальном проекте IDs категорий лучше грузить с бэка.
      // Для MVP мы сделаем маппинг вручную или будем слать slug, если бэк умеет.
      // Сейчас предположим, что бэк примет создание, но категории надо передавать ID.
      // Давай пока отправим без категорий, или реализуем хардкод ID:
      // 1 - Кошка, 2 - Собака (это пример, посмотри в админке свои ID)
      
      const payload = {
        name: name,
        gender: gender,
        birth_date: birthDate || null,
        // categories: [1] // <-- Сюда надо подставить реальный ID из базы. Пока опустим, если поле не обязательное.
        // Если обязательное - нам нужно сначала получить список категорий.
      };

      const res = await fetch('http://127.0.0.1:8000/api/pets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess(); // Обновляем список
        onClose();   // Закрываем окно
        // Сброс формы
        setName('');
        setGender('');
      } else {
        const data = await res.json();
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Затемнение фона */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Само окно */}
      <div className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Добавить питомца</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Тело формы */}
        <div className="p-6 space-y-6">
          
          {/* 1. КТО ЭТО? (Вид) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Кто у вас?</label>
            <div className="grid grid-cols-3 gap-3">
              <TypeButton 
                active={categorySlug === 'cat'} 
                onClick={() => setCategorySlug('cat')} 
                icon={<Cat />} label="Кошка" 
              />
              <TypeButton 
                active={categorySlug === 'dog'} 
                onClick={() => setCategorySlug('dog')} 
                icon={<Dog />} label="Собака" 
              />
              <TypeButton 
                active={categorySlug === 'other'} 
                onClick={() => setCategorySlug('other')} 
                icon={<Rabbit />} label="Другое" 
              />
            </div>
          </div>

          {/* 2. ПОЛ */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Пол</label>
            <div className="flex gap-4">
              <button 
                onClick={() => setGender('M')}
                className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition font-medium
                  ${gender === 'M' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-200'}`}
              >
                Мальчик
                {gender === 'M' && <Check size={16} />}
              </button>
              
              <button 
                onClick={() => setGender('F')}
                className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition font-medium
                  ${gender === 'F' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-500 hover:border-pink-200'}`}
              >
                Девочка
                {gender === 'F' && <Check size={16} />}
              </button>
            </div>
          </div>

          {/* 3. ИМЯ */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Кличка</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Барсик"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black focus:ring-0 outline-none transition text-lg"
            />
          </div>

          {/* 4. ДАТА РОЖДЕНИЯ (Опционально) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Дата рождения (примерно)</label>
            <input 
              type="date" 
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none"
            />
          </div>

          {/* ОШИБКА */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* ФУТЕР */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Создаем...' : 'Добавить питомца'}
          </button>
        </div>

      </div>
    </div>
  );
}

// Мини-компонент для кнопки выбора вида
const TypeButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition ${
      active 
        ? 'border-black bg-black text-white' 
        : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300'
    }`}
  >
    <div className="mb-1">{icon}</div>
    <span className="text-xs font-bold">{label}</span>
  </button>
);