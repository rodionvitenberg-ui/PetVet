'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Users, PawPrint, LayoutGrid, Grid3x3, BookText, CalendarCheck } from 'lucide-react';
import PetCard from '@/components/dashboard/PetCard';
import CreatePetModal from '@/components/dashboard/CreatePetModal';
import CreatePatientModal from '@/components/dashboard/CreatePatientModal';
import PetDetailsModal from '@/components/dashboard/PetDetailsModal';
import PetsActionBar from '@/components/dashboard/PetsActionBar';
import { PetBasic } from '@/types/pet';
import { PetEvent } from '@/types/event';
import AuthGuard from '@/components/providers/AuthGuard';
import SearchInput from '@/components/ui/SearchInput';
import PetFilters from '@/components/dashboard/PetFilters';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [pets, setPets] = useState<PetBasic[]>([]);
    const [todayEvents, setTodayEvents] = useState<PetEvent[]>([]);
    const [isPetsLoading, setIsPetsLoading] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreatePatientModalOpen, setIsCreatePatientModalOpen] = useState(false);
    const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'my' | 'patients' | 'today'>('my');

    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const isCompact = density === 'compact';

    const fetchPets = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const queryString = searchParams.toString();
            const res = await fetch(`${API_URL}/api/pets/?${queryString}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setPets(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsPetsLoading(false);
        }
    }, [searchParams]);

    // Today: прямой запрос planned-событий на сегодня через /api/events/
    const fetchTodayEvents = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);

            const res = await fetch(
                `${API_URL}/api/events/?start_date=${encodeURIComponent(start.toISOString())}&end_date=${encodeURIComponent(end.toISOString())}&status=planned`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (res.ok) {
                const data = await res.json();
                setTodayEvents(Array.isArray(data) ? data : data.results || []);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchPets();
            fetchTodayEvents();
        }
    }, [user, fetchPets, fetchTodayEvents]);

    const myPets = pets.filter(p => p.owner === user?.id);
    const patients = pets.filter(p => p.owner !== user?.id);

    // Питомцы с запланированными событиями на сегодня
    const todayPetIds = new Set(todayEvents.map(ev => ev.pet).filter(Boolean));
    const todayPets = pets.filter(p => todayPetIds.has(p.id));

    const displayedPets = viewMode === 'my' ? myPets : viewMode === 'today' ? todayPets : patients;

    const todayEventsCount = todayEvents.length;

    const hasFilters = searchParams.toString().length > 0;

    useEffect(() => {
        if (!isPetsLoading && user?.is_veterinarian && myPets.length === 0 && patients.length > 0) {
            setViewMode('patients');
        }
    }, [isPetsLoading, user, myPets.length, patients.length]);

    const handlePetClick = (petId: number) => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            router.push(`/pets/${petId}`);
        } else {
            setSelectedPetId(petId);
            setIsDetailsOpen(true);
        }
    };

    return (
        <AuthGuard>
            <div className="min-h-screen bg-gray-50/50 pt-24 pb-10 px-4 sm:px-6">
                <div className="max-w-[1920px] mx-auto">

                    <div className="mb-8 max-w-7xl mx-auto">
                        <PetsActionBar />
                    </div>

                    <header className="flex flex-col gap-5 mb-8 max-w-7xl mx-auto w-full">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    {viewMode === 'my' ? 'My Pets' : viewMode === 'today' ? "Today's Schedule" : 'Clinic Patients'}
                                </h1>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="hidden sm:flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                                    <button
                                        onClick={() => setDensity('comfortable')}
                                        title="View as comfortable grid"
                                        className={`p-2 rounded-lg transition-all ${!isCompact ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <LayoutGrid size={20} />
                                    </button>
                                    <button
                                        onClick={() => setDensity('compact')}
                                        title="View as compact list"
                                        className={`p-2 rounded-lg transition-all ${isCompact ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <Grid3x3 size={20} />
                                    </button>
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
                                            <PawPrint size={16} /> <span className="hidden sm:inline">My Pets</span>
                                        </button>
                                        <button
                                            onClick={() => setViewMode('patients')}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                                                viewMode === 'patients'
                                                    ? 'bg-emerald-50 text-emerald-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <Users size={16} /> <span className="hidden sm:inline">Clinic</span>
                                        </button>
                                        <button
                                            onClick={() => setViewMode('today')}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                                                viewMode === 'today'
                                                    ? 'bg-amber-50 text-amber-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <CalendarCheck size={16} /> <span className="hidden sm:inline">Today</span>
                                            {todayEventsCount > 0 && (
                                                <span className="bg-amber-200 text-amber-800 text-[10px] px-1 rounded-full">{todayEventsCount}</span>
                                            )}
                                        </button>
                                    </div>
                                )}

                                <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
                                    <Link
                                        href="/dashboard/catalog"
                                        className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                    >
                                        <BookText size={16} /> <span className="hidden sm:inline">Catalog</span>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <SearchInput
                                placeholder={viewMode === 'my'
                                    ? "Search by nickname..."
                                    : "Search by name, owner's last name, phone..."
                                }
                            />
                            <PetFilters />
                        </div>
                    </header>

                    <div className={`grid gap-4 sm:gap-6 mx-auto
                        ${isCompact
                            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 max-w-full'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl'
                        }`}
                    >
                        {viewMode === 'my' && (
                            <PetCard
                                isAddButton
                                variant={density}
                                addButtonText={isCompact ? "Add" : "Add Pet"}
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

                        {viewMode === 'patients' && user?.is_veterinarian && (
                            <PetCard
                                isAddButton
                                variant={density}
                                addButtonText={isCompact ? "New" : "New Patient"}
                                onClick={() => {
                                    const isMobile = window.innerWidth < 768;
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
                                    variant={density}
                                    onClick={() => handlePetClick(pet.id)}
                                />

                                {viewMode === 'patients' && (
                                    <div className={`absolute backdrop-blur-md text-white rounded-lg font-medium z-20 flex items-center gap-1
                                        ${isCompact
                                            ? 'top-2 left-2 px-1.5 py-0.5 text-[10px]'
                                            : 'top-3 left-3 px-2 py-1 text-xs'
                                        } ${pet.owner_info?.is_temporary ? "bg-yellow-500/40" : "bg-black/60"}`}
                                    >
                                        <Users size={isCompact ? 8 : 10} className={pet.owner_info?.is_temporary ? "text-yellow-200" : "text-emerald-400"} />
                                        <span className="truncate max-w-[80px] sm:max-w-none">
                                            {pet.owner_info?.name || pet.temp_owner_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}

                        {displayedPets.length === 0 && viewMode === 'today' && (
                            <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                                <CalendarCheck size={48} className="mx-auto mb-3 opacity-50" />
                                <p>No events scheduled for today.</p>
                            </div>
                        )}

                        {displayedPets.length === 0 && viewMode === 'patients' && (
                            <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                                <Users size={48} className="mx-auto mb-3 opacity-50" />
                                {hasFilters ? (
                                    <>
                                        <p>Patients not found.</p>
                                        <p className="text-sm mt-1">Try changing the search parameters.</p>
                                    </>
                                ) : (
                                    <>
                                        <p>You don't have any patients yet.</p>
                                        <p className="text-sm mt-1">Ask the owner to send you an access link.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <CreatePetModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        onSuccess={fetchPets}
                    />

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
        </AuthGuard>
    );
}