'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
    Camera, Save, Lock, Trash2, Plus, 
    Phone, Mail, MessageCircle, Send, Instagram, Globe, 
    Loader2, Briefcase, MapPin, User, AlertTriangle // <--- 1. Добавлена иконка
} from 'lucide-react';
import DeleteAccountModal from '@/components/DeleteAccountModal';

// === ТИПЫ ===
type ContactType = 'phone' | 'whatsapp' | 'telegram' | 'instagram' | 'email' | 'site' | 'vk' | 'other';

interface UserContact {
    id: number;
    type: ContactType;
    type_display: string;
    value: string;
    label?: string;
}

// Конфиг для иконок контактов
const CONTACT_CONFIG: Record<string, { icon: React.ReactNode, label: string, color: string }> = {
    whatsapp: { icon: <MessageCircle size={16} />, label: 'WhatsApp', color: 'text-green-600 bg-green-50 border-green-200' },
    telegram: { icon: <Send size={16} />, label: 'Telegram', color: 'text-blue-500 bg-blue-50 border-blue-200' },
    instagram: { icon: <Instagram size={16} />, label: 'Instagram', color: 'text-pink-600 bg-pink-50 border-pink-200' },
    email: { icon: <Mail size={16} />, label: 'Email', color: 'text-gray-600 bg-gray-50 border-gray-200' },
    site: { icon: <Globe size={16} />, label: 'Сайт', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    vk: { icon: <span className="font-bold text-xs">VK</span>, label: 'VK', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    phone: { icon: <Phone size={16} />, label: 'Телефон', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    other: { icon: <User size={16} />, label: 'Другое', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // === STATE: ОСНОВНОЙ ПРОФИЛЬ ===
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',     // Основной (личный) телефон
    city: '',
    clinic_name: '',
    about: '',     // О себе
    email: '', 
  });

  // === STATE: ПАРОЛИ ===
  const [passwords, setPasswords] = useState({
    password: '',
    confirm_password: ''
  });

  // === STATE: КОНТАКТЫ ===
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [newContact, setNewContact] = useState<{ type: ContactType, value: string, label: string }>({
      type: 'phone',
      value: '',
      label: ''
  });
  const [isAddingContact, setIsAddingContact] = useState(false);

  // === STATE: УДАЛЕНИЕ АККАУНТА (NEW) ===
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);


  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: (user as any).phone || '',
        city: (user as any).city || '',
        clinic_name: (user as any).clinic_name || '',
        about: (user as any).about || '', 
        email: user.email || '',
      });
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
      try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/api/auth/contacts/`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setContacts(data);
          }
      } catch (e) {
          console.error("Failed to load contacts", e);
      } finally {
          setContactsLoading(false);
      }
  };

  // === ЛОГИКА АВАТАРА ===
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('avatar', file);

    try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/api/auth/me/`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` },
            body: uploadData
        });

        if (!res.ok) throw new Error('Ошибка загрузки фото');
        const updatedUser = await res.json();
        updateUser(updatedUser);
        setMessage({ type: 'success', text: 'Фото обновлено!' });
    } catch (err) {
        setMessage({ type: 'error', text: 'Не удалось загрузить фото' });
    } finally {
        setLoading(false);
    }
  };

  // === ЛОГИКА СОХРАНЕНИЯ ПРОФИЛЯ ===
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
        const token = localStorage.getItem('access_token');
        const payload: any = { ...formData };
        delete payload.email;

        if (passwords.password) {
            if (passwords.password !== passwords.confirm_password) {
                throw new Error('Пароли не совпадают');
            }
            if (passwords.password.length < 6) {
                throw new Error('Пароль слишком короткий');
            }
            payload.password = passwords.password;
        }

        const res = await fetch(`${API_URL}/api/auth/me/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Ошибка сохранения');

        const updatedUser = await res.json();
        updateUser(updatedUser);
        setMessage({ type: 'success', text: 'Профиль сохранен!' });
        setPasswords({ password: '', confirm_password: '' });
    } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Ошибка при сохранении' });
    } finally {
        setLoading(false);
    }
  };

  // === ЛОГИКА КОНТАКТОВ (CRUD) ===
  const handleAddContact = async () => {
      if (!newContact.value) return;
      setIsAddingContact(true);
      try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/api/auth/contacts/`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify(newContact)
          });
          
          if (res.ok) {
              await fetchContacts();
              setNewContact({ type: 'phone', value: '', label: '' }); // Reset
          }
      } catch (e) {
          alert("Ошибка добавления контакта");
      } finally {
          setIsAddingContact(false);
      }
  };

  const handleDeleteContact = async (id: number) => {
      if (!confirm('Удалить этот контакт?')) return;
      try {
          const token = localStorage.getItem('access_token');
          await fetch(`${API_URL}/api/auth/contacts/${id}/`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          setContacts(prev => prev.filter(c => c.id !== id));
      } catch (e) {
          alert("Ошибка удаления");
      }
  };

  // === ЛОГИКА УДАЛЕНИЯ АККАУНТА (NEW) ===
// 1. Просто открываем модалку при клике на кнопку в "Опасной зоне"
const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
};

// 2. Эта функция вызывается уже внутри модалки при подтверждении
const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/api/auth/me/`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}` 
            }
        });

        if (res.ok) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login'; 
        } else {
            alert("Не удалось удалить аккаунт. Попробуйте позже.");
            setIsDeleting(false); // Снимаем лоадер только если ошибка
            setIsDeleteModalOpen(false); // Закрываем модалку
        }
    } catch (e) {
        console.error("Delete error", e);
        alert("Произошла ошибка соединения");
        setIsDeleting(false);
        setIsDeleteModalOpen(false);
    }
};

  if (!user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pt-24 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Настройки профиля</h1>
            <p className="text-gray-500 mt-1">Управляйте личной информацией и контактами</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {message.type === 'success' ? <div className="w-2 h-2 rounded-full bg-green-500" /> : <div className="w-2 h-2 rounded-full bg-red-500" />}
            {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === ЛЕВАЯ КОЛОНКА (Аватар + Статус) === */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
                <div className="relative inline-block group cursor-pointer" onClick={handleAvatarClick}>
                    <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto relative bg-gray-100">
                        {user.avatar ? (
                            <img 
                                src={user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <User size={64} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium gap-2">
                            <Camera size={20} />
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                
                <h2 className="mt-4 text-xl font-bold text-gray-900">{user.username}</h2>
                <p className="text-gray-500 text-sm mb-4">{user.email}</p>
                
                <div className="flex justify-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.is_veterinarian ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {user.is_veterinarian ? 'Ветеринар' : 'Владелец'}
                    </span>
                    {user.is_veterinarian && (user as any).is_verified && (
                         <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-100">
                            Verified
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* === ПРАВАЯ КОЛОНКА (Формы) === */}
        <div className="lg:col-span-2 space-y-8">

            {/* 2. Личные данные */}
            <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <User size={20} className="text-blue-500" /> Личные данные
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Имя</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-200 outline-none transition"
                            value={formData.first_name}
                            onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Фамилия</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-200 outline-none transition"
                            value={formData.last_name}
                            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        />
                    </div>
                </div>

                <div className="mb-4">
                     <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">О себе / Специализация</label>
                     <textarea 
                        rows={3}
                        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-200 outline-none transition resize-none"
                        value={formData.about}
                        placeholder={user.is_veterinarian ? "Расскажите о своем опыте и услугах..." : "Пара слов о вас..."}
                        onChange={(e) => setFormData({...formData, about: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Город</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-blue-200 outline-none transition"
                                value={formData.city}
                                onChange={(e) => setFormData({...formData, city: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Основной телефон</label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-blue-200 outline-none transition"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                placeholder="Для входа в аккаунт"
                            />
                        </div>
                    </div>
                </div>

                {user.is_veterinarian && (
                    <div className="mb-8 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                         <label className="block text-xs font-bold text-emerald-700 mb-1 uppercase flex items-center gap-1">
                            <Briefcase size={14} /> Место работы
                         </label>
                         <input 
                            type="text" 
                            className="w-full border border-emerald-200 bg-white rounded-xl p-3 focus:ring-2 focus:ring-emerald-200 outline-none transition text-emerald-900"
                            value={formData.clinic_name}
                            onChange={(e) => setFormData({...formData, clinic_name: e.target.value})}
                            placeholder="Название клиники"
                        />
                    </div>
                )}

                {/* Смена пароля */}
                <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Lock size={16} className="text-gray-400" /> Смена пароля
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <input 
                                type="password" 
                                placeholder="Новый пароль"
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                                value={passwords.password}
                                onChange={(e) => setPasswords({...passwords, password: e.target.value})}
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <input 
                                type="password" 
                                placeholder="Подтвердите пароль"
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                                value={passwords.confirm_password}
                                onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                        Сохранить изменения
                    </button>
                </div>
            </form>


            {/* 1. Блок Контактов */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Phone size={20} className="text-blue-500" /> Каналы связи
                </h3>
                <p className="text-sm text-gray-500 mb-6">Добавьте способы связи, чтобы {user.is_veterinarian ? 'владельцы' : 'врачи'} могли связаться с вами.</p>

                {/* Список контактов */}
                <div className="space-y-3 mb-6">
                    {contactsLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-300" /></div>
                    ) : contacts.length === 0 ? (
                        <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm">
                            Нет дополнительных контактов
                        </div>
                    ) : (
                        contacts.map(c => {
                            const config = CONTACT_CONFIG[c.type] || CONTACT_CONFIG['other'];
                            return (
                                <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border ${config.color} bg-opacity-30`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm`}>
                                            {config.icon}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold opacity-70 uppercase tracking-wide">{c.label || config.label}</p>
                                            <p className="font-medium text-gray-900 text-sm">{c.value}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteContact(c.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Форма добавления контакта */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <select 
                            className="p-2.5 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-200"
                            value={newContact.type}
                            onChange={e => setNewContact({...newContact, type: e.target.value as ContactType})}
                        >
                            {Object.entries(CONTACT_CONFIG).map(([key, conf]) => (
                                <option key={key} value={key}>{conf.label}</option>
                            ))}
                        </select>
                        <input 
                            type="text" 
                            placeholder="Номер или никнейм"
                            className="p-2.5 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200 text-sm sm:col-span-2"
                            value={newContact.value}
                            onChange={e => setNewContact({...newContact, value: e.target.value})}
                        />
                    </div>
                    <div className="flex gap-3">
                         <input 
                            type="text" 
                            placeholder="Метка (например: Рабочий)"
                            className="flex-1 p-2.5 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                            value={newContact.label}
                            onChange={e => setNewContact({...newContact, label: e.target.value})}
                        />
                        <button 
                            onClick={handleAddContact}
                            disabled={!newContact.value || isAddingContact}
                            className="bg-gray-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-black transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {isAddingContact ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Добавить
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. ОПАСНАЯ ЗОНА (NEW) */}
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} /> Опасная зона
                </h3>
                <p className="text-sm text-red-700/80 mb-6 leading-relaxed">
                    Удаление аккаунта приведет к полному стиранию всех ваших личных данных, 
                    профилей питомцев и истории медицинских записей. <br/>
                    <span className="font-bold">Отменить это действие будет невозможно.</span>
                </p>

                <div className="flex justify-end">
{/* Внутри "Опасной зоны" меняем onClick */}
<button 
    onClick={handleDeleteClick} // <-- Теперь просто открываем модалку
    // disabled={isDeleting} <-- Можно убрать disabled, так как лоадер теперь в модалке
    className="bg-white border-2 border-red-200 text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition shadow-sm flex items-center gap-2"
>
    <Trash2 size={18} />
    Удалить аккаунт
</button>
                </div>
            </div>

        </div>
      </div>
      {/* МОДАЛЬНОЕ ОКНО */}
    <DeleteAccountModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
    />
    </div>
  );
}