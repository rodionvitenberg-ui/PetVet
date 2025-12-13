//web-portal/app/pet/create/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreatePetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '',
    weight: '',
    chip_number: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('access_token');

    try {
        // Отправляем POST запрос
        const res = await fetch('http://127.0.0.1:8000/api/pets/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' // Шлем JSON, фото добавим позже
            },
            body: JSON.stringify(formData)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(JSON.stringify(err));
        }

        const newPet = await res.json();
        
        // Успех! Перенаправляем на страницу редактирования созданного питомца,
        // чтобы пользователь мог сразу добавить фото.
        router.push(`/pet/${newPet.id}`);
        
    } catch (err) {
        alert('Ошибка создания: ' + err.message);
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex justify-center items-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
          ✨ Новый пациент
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Имя питомца</label>
            <input 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                className="w-full border-b-2 border-gray-200 focus:border-blue-500 outline-none py-2 text-lg" 
                placeholder="Например, Барсик"
                required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Вид</label>
                <select 
                    name="species" 
                    value={formData.species} 
                    onChange={handleChange} 
                    className="w-full border-b-2 py-2 bg-transparent outline-none"
                >
                    <option value="dog">Собака</option>
                    <option value="cat">Кошка</option>
                    <option value="other">Другое</option>
                </select>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Порода</label>
                <input 
                    name="breed" 
                    value={formData.breed} 
                    onChange={handleChange} 
                    className="w-full border-b-2 outline-none py-2" 
                    placeholder="Необязательно"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Вес (кг)</label>
                <input 
                    type="number" 
                    step="0.1" 
                    name="weight" 
                    value={formData.weight} 
                    onChange={handleChange} 
                    className="w-full border-b-2 outline-none py-2" 
                />
             </div>
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Чип</label>
                <input 
                    name="chip_number" 
                    value={formData.chip_number} 
                    onChange={handleChange} 
                    className="w-full border-b-2 outline-none py-2" 
                />
             </div>
          </div>

          <div className="pt-6 flex gap-3">
            <button 
                type="submit" 
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold shadow-md disabled:opacity-50"
            >
                {loading ? 'Создаем...' : 'Создать и добавить фото →'}
            </button>
            <button 
                type="button" 
                onClick={() => router.push('/')} 
                className="bg-gray-100 text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-200"
            >
                Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}