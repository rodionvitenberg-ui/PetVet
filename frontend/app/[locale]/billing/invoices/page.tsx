'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { 
    FileText, Search, Filter, Download, 
    CheckCircle2, Clock, AlertCircle, 
    CreditCard, ArrowUpRight, Ban, X, Loader2
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import SearchInput from '@/components/ui/SearchInput';
import PaymentModal from '@/components/billing/PaymentModal';
import CreateEventModal from '@/components/dashboard/CreateEventModal';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoiceDocument } from '@/components/billing/InvoiceDocument';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface InvoiceItem {
    id: number;
    name_at_moment: string;
    quantity: number;
    price_at_moment: number;
    subtotal: number;
}

interface Invoice {
    id: number;
    status: 'draft' | 'unpaid' | 'paid' | 'cancelled';
    total_amount: string;
    created_at: string;
    // [UPD] Обновили интерфейс клиента
    client_info?: { id: number | null; name: string; is_shadow?: boolean };
    guest_name?: string;
    pet_name?: string;
    pet?: number;
    event?: number;
    items: InvoiceItem[];
}

export default function InvoicesPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);

    const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean, id: number | null, amount: string }>({ isOpen: false, id: null, amount: '0' });
    const [isPaySubmitting, setIsPaySubmitting] = useState(false);

    const [eventModal, setEventModal] = useState<{ isOpen: boolean, petId: number | null, eventData: any | null }>({ isOpen: false, petId: null, eventData: null });
    const [isEventLoading, setIsEventLoading] = useState(false);

    const stats = useMemo(() => {
        let unpaid = 0;
        let paid = 0;
        invoices.forEach(inv => {
            const amount = parseFloat(inv.total_amount);
            if (inv.status === 'unpaid') unpaid += amount;
            if (inv.status === 'paid') paid += amount;
        });
        return { unpaid, paid };
    }, [invoices]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const queryString = searchParams.toString();
            
            const res = await fetch(`${API_URL}/api/billing/invoices/?ordering=-created_at&${queryString}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInvoices(Array.isArray(data) ? data : data.results || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [searchParams]);

    const openPaymentModal = (id: number, amount: string) => {
        setPaymentModal({ isOpen: true, id, amount });
    };

    const handlePaymentConfirm = async () => {
        if (!paymentModal.id) return;
        setIsPaySubmitting(true);
        
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_URL}/api/billing/invoices/${paymentModal.id}/`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'paid' })
            });
            
            if (res.ok) {
                setInvoices(prev => prev.map(inv => inv.id === paymentModal.id ? { ...inv, status: 'paid' } : inv));
                setPaymentModal({ isOpen: false, id: null, amount: '0' });
            }
        } catch (e) {
            console.error(e);
            alert("Ошибка соединения");
        } finally {
            setIsPaySubmitting(false);
        }
    };

    const handleOpenDetails = async (invoice: Invoice) => {
        if (!invoice.event || !invoice.pet) return alert("Этот счет не привязан к событию.");
        setIsEventLoading(true);
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_URL}/api/events/${invoice.event}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const eventData = await res.json();
                setEventModal({ isOpen: true, petId: invoice.pet, eventData: eventData });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsEventLoading(false);
        }
    };

    const StatusFilter = () => {
        const currentStatus = searchParams.get('status') || '';
        const handleChange = (val: string) => {
            const params = new URLSearchParams(searchParams);
            if (val) params.set('status', val); else params.delete('status');
            router.replace(`${pathname}?${params.toString()}`);
        };
        return (
            <div className="relative">
                <select value={currentStatus} onChange={(e) => handleChange(e.target.value)} className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer min-w-[150px]">
                    <option value="">Все статусы</option>
                    <option value="unpaid">Ожидают оплаты</option>
                    <option value="paid">Оплачены</option>
                    <option value="draft">Черновики</option>
                    <option value="cancelled">Отменены</option>
                </select>
                {currentStatus ? (
                    <button onClick={() => handleChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={14} /></button>
                ) : (
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pt-24 pb-10 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto space-y-6">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Счета и Оплаты</h1>
                        <p className="text-gray-500 text-sm">Финансовый контроль клиники</p>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="bg-white p-3 pr-6 rounded-xl border border-red-100 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertCircle size={20} /></div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase">Долг клиентов</div>
                                <div className="text-lg font-bold text-gray-900">{stats.unpaid.toFixed(2)} €</div>
                            </div>
                        </div>
                        <div className="bg-white p-3 pr-6 rounded-xl border border-green-100 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={20} /></div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase">Оплачено</div>
                                <div className="text-lg font-bold text-gray-900">{stats.paid.toFixed(2)} €</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
                    <SearchInput placeholder="Поиск по номеру счета, клиенту..." />
                    <StatusFilter />
                    <button className="ml-auto flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-4 py-2 hover:bg-gray-50 rounded-lg transition">
                        <Download size={18} /> <span className="hidden sm:inline">Экспорт CSV</span>
                    </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Счет</th>
                                    <th className="px-6 py-4">Клиент / Пациент</th>
                                    <th className="px-6 py-4">Сумма</th>
                                    <th className="px-6 py-4">Статус</th>
                                    <th className="px-6 py-4 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32 mb-2"></div><div className="h-3 bg-gray-100 rounded w-20"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-20"></div></td>
                                            <td className="px-6 py-4"></td>
                                        </tr>
                                    ))
                                ) : invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                            Счета не найдены
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-gray-50 group transition">
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-bold text-gray-900">#{inv.id}</div>
                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <Clock size={10} /> {new Date(inv.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            
                                            <td className="px-6 py-4 align-top">
                                                {/* [UPD] Отображение клиента с поддержкой теневых */}
                                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                                    {inv.client_info?.name || inv.guest_name || "Аноним"}
                                                    {inv.client_info?.is_shadow && (
                                                        <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold uppercase">Врем.</span>
                                                    )}
                                                </div>
                                                {inv.pet_name && (
                                                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1 font-bold">{inv.pet_name}</div>
                                                )}
                                                <div className="text-xs text-gray-400 mt-1 truncate max-w-[200px]">{inv.items.map(i => i.name_at_moment).join(', ')}</div>
                                            </td>
                                            
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-mono font-bold text-gray-900 text-lg">{inv.total_amount} €</div>
                                                <div className="text-xs text-gray-400">{inv.items.length} поз.</div>
                                            </td>
                                            
                                            <td className="px-6 py-4 align-top">
                                                {inv.status === 'paid' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle2 size={12} /> Оплачен</span>}
                                                {inv.status === 'unpaid' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 animate-pulse"><Clock size={12} /> Ожидает</span>}
                                                {inv.status === 'draft' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600"><FileText size={12} /> Черновик</span>}
                                                {inv.status === 'cancelled' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600"><Ban size={12} /> Отменен</span>}
                                            </td>
                                            
                                            <td className="px-6 py-4 text-right align-top">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    
                                                    {inv.status === 'unpaid' && (
                                                        <button 
                                                            onClick={() => openPaymentModal(inv.id, inv.total_amount)}
                                                            title="Отметить как Оплаченный"
                                                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                                                        >
                                                            <CreditCard size={18} />
                                                        </button>
                                                    )}
                                                    
                                                    {isClient ? (
                                                        <PDFDownloadLink
                                                            document={<InvoiceDocument invoice={inv} user={user} />}
                                                            fileName={`invoice_${inv.id}.pdf`}
                                                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition flex items-center justify-center"
                                                            title="Скачать PDF"
                                                        >
                                                            {({ loading }) => (
                                                                loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />
                                                            )}
                                                        </PDFDownloadLink>
                                                    ) : (
                                                        <button disabled className="p-2 bg-gray-100 text-gray-600 rounded-lg opacity-50">
                                                            <Loader2 size={18} className="animate-spin" />
                                                        </button>
                                                    )}

                                                    <button 
                                                        onClick={() => handleOpenDetails(inv)}
                                                        disabled={isEventLoading}
                                                        title="Перейти к услугам и товарам"
                                                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                                                    >
                                                        {isEventLoading ? <Loader2 size={18} className="animate-spin"/> : <ArrowUpRight size={18} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <PaymentModal 
                isOpen={paymentModal.isOpen}
                onClose={() => setPaymentModal({ isOpen: false, id: null, amount: '0' })}
                onConfirm={handlePaymentConfirm}
                invoiceId={paymentModal.id}
                amount={paymentModal.amount}
                isSubmitting={isPaySubmitting}
            />

            {eventModal.isOpen && eventModal.petId && (
                <CreateEventModal 
                    isOpen={eventModal.isOpen}
                    onClose={() => setEventModal({ ...eventModal, isOpen: false })}
                    onSuccess={() => {
                        setEventModal({ ...eventModal, isOpen: false });
                        fetchInvoices(); 
                    }}
                    petId={eventModal.petId}
                    initialData={eventModal.eventData}
                    initialTab="billing" 
                />
            )}
        </div>
    );
}