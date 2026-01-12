'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Plus, Users, PawPrint } from 'lucide-react';
import PetCard from '@/components/dashboard/PetCard';
import CreatePetModal from '@/components/dashboard/CreatePetModal';
import CreatePatientModal from '@/components/dashboard/CreatePatientModal'; // <--- 1. Импорт
import PetDetailsModal from '@/components/dashboard/PetDetailsModal';
import PetsActionBar from '@/components/dashboard/PetsActionBar';
import { PetBasic } from '@/types/pet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [pets, setPets] = useState<PetBasic[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreatePatientModalOpen, setIsCreatePatientModalOpen] = useState(false); // <--- 2. Новое состояние
    const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Режим просмотра: 'my' (свои) или 'patients' (чужие)
    const [viewMode, setViewMode] = useState<'my' | 'patients'>('my');

    const fetchPets = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            
            const res = await fetch(`${API_URL}/api/pets/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setPets(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPets();
    }, []);

    const handlePetClick = (petId: number) => {
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            router.push(`/pets/${petId}`);
        } else {
            setSelectedPetId(petId);
            setIsDetailsOpen(true);
        }
    };

    const myPets = pets.filter(p => p.owner === user?.id);
    const patients = pets.filter(p => p.owner !== user?.id);

    useEffect(() => {
        if (!loading && user?.is_veterinarian && myPets.length === 0 && patients.length > 0) {
            setViewMode('patients');
        }
    }, [loading, user, myPets.length, patients.length]);

    const displayedPets = viewMode === 'my' ? myPets : patients;

    return (
        <div className="min-h-screen bg-gray-50/50 pt-24 pb-10 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
                
                <div className="mb-8">
                    <PetsActionBar />
                </div>
                
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {viewMode === 'my' ? 'Мои питомцы' : 'Мои пациенты'}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            {viewMode === 'my' 
                                ? 'Управляйте профилями ваших любимцев' 
                                : 'Медицинские карты животных, доступные вам'}
                        </p>
                    </div>

                    {user?.is_veterinarian && (
                        <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
                            <button
                                onClick={() => setViewMode('my')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                                    viewMode === 'my' 
                                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <PawPrint size={16} /> Личные
                            </button>
                            <button
                                onClick={() => setViewMode('patients')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                                    viewMode === 'patients' 
                                    ? 'bg-emerald-50 text-emerald-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <Users size={16} /> Пациенты
                                {patients.length > 0 && (
                                    <span className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 rounded-full">
                                        {patients.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    
                    {/* Кнопка создания СВОЕГО питомца */}
                    {viewMode === 'my' && (
                        <PetCard 
                            isAddButton 
                            addButtonText="Добавить питомца"
                            onClick={() => {
                                const isMobile = window.innerWidth < 768;
                                if (isMobile) {
                                    router.push('/pets/create');
                                } else {
                                    setIsCreateModalOpen(true);
                                }
                            }} 
                        />
                    )}

                    {/* Кнопка создания ПАЦИЕНТА (для ветеринара) */}
                    {viewMode === 'patients' && user?.is_veterinarian && (
                        <PetCard 
                            isAddButton
                            addButtonText="Новый пациент"
                            onClick={() => {
                                const isMobile = window.innerWidth < 768;
                                // 3. Логика переключения: Страница (моб) или Модалка (десктоп)
                                if (isMobile) {
                                    router.push('/pets/create-client');
                                } else {
                                    setIsCreatePatientModalOpen(true);
                                }
                            }} 
                        />
                    )}

                    {displayedPets.map(pet => (
                        <div key={pet.id} className="relative">
                            <PetCard 
                                pet={pet} 
                                onClick={() => handlePetClick(pet.id)} 
                            />
                            
                            {viewMode === 'patients' && (
                                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-lg text-xs font-medium z-20 flex items-center gap-1">
                                    <Users size={10} className={pet.owner_info?.is_temporary ? "text-yellow-400" : "text-emerald-400"} />
                                    <span>
                                        {pet.owner_info?.is_temporary ? "Вл (Врем): " : "Вл: "}
                                        {pet.owner_info?.name || pet.temp_owner_name}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}

                    {displayedPets.length === 0 && viewMode === 'patients' && !user?.is_veterinarian && (
                        <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                            <Users size={48} className="mx-auto mb-3 opacity-50" />
                            <p>У вас пока нет пациентов.</p>
                            <p className="text-sm mt-1">Попросите владельца отправить вам ссылку доступа.</p>
                        </div>
                    )}
                </div>

                {/* МОДАЛКИ */}
                <CreatePetModal 
                    isOpen={isCreateModalOpen} 
                    onClose={() => setIsCreateModalOpen(false)} 
                    onSuccess={fetchPets}
                />
                
                {/* 4. Модалка создания пациента */}
                <CreatePatientModal
                    isOpen={isCreatePatientModalOpen}
                    onClose={() => setIsCreatePatientModalOpen(false)}
                    onSuccess={fetchPets}
                />
                
                {selectedPetId && (
                    <PetDetailsModal 
                        petId={selectedPetId} 
                        isOpen={isDetailsOpen} 
                        onClose={() => setIsDetailsOpen(false)} 
                    />
                )}
            </div>
        </div>
    );
}