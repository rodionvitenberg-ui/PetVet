'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<'owner' | 'vet'>('owner');
  const [details, setDetails] = useState({ city: '', clinic_name: '' });
  // Добавляем стейт для паролей
  const [passwords, setPasswords] = useState({ password: '', confirm_password: '' }); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const handleSubmit = async () => {
    setError('');
    
    // Валидация пароля (если пользователь решил его ввести)
    if (passwords.password || passwords.confirm_password) {
        if (passwords.password !== passwords.confirm_password) {
            setError('Passwords do not match');
            return;
        }
        if (passwords.password.length < 6) {
             setError('Password is too short');
             return;
        }
    }

    setLoading(true);
    const token = localStorage.getItem('access_token');
    
    try {
      const body: any = {
        role: role,
        ...(role === 'vet' ? details : {}),
      };

      // Добавляем пароль в запрос только если он заполнен
      if (passwords.password) {
        body.password = passwords.password;
      }

      const res = await fetch(`${API_URL}/api/auth/me/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push('/'); 
        router.refresh();
      } else {
        const errData = await res.json();
        // Пытаемся красиво вывести ошибку от Django
        const msg = Object.values(errData).flat().join(', ') || 'Error saving data';
        setError(msg);
      }
    } catch (e) {
        console.error(e);
        setError('Network error');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary/10 py-10">
      <div className="bg-card p-8 rounded-xl shadow-lg w-full max-w-lg">
        <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Welcome! 👋</h1>
        <p className="text-muted-foreground mb-6 text-center">Set up your profile to get started</p>

        {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded mb-4 text-sm text-center">
                {error}
            </div>
        )}

        <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Choose your role:</label>
            <div className="grid grid-cols-2 gap-4">
                <div 
                    onClick={() => setRole('owner')}
                    className={`cursor-pointer border-2 rounded-xl p-4 text-center transition ${
                        role === 'owner' ? 'border-blue-500 bg-primary/10' : 'border-border hover:border-primary/40'
                    }`}
                >
                    <div className="text-3xl mb-1">🐱</div>
                    <div className="font-bold text-foreground">Owner</div>
                </div>

                <div 
                    onClick={() => setRole('vet')}
                    className={`cursor-pointer border-2 rounded-xl p-4 text-center transition ${
                        role === 'vet' ? 'border-green-500 bg-success/10' : 'border-border hover:border-green-300'
                    }`}
                >
                    <div className="text-3xl mb-1">👨‍⚕️</div>
                    <div className="font-bold text-foreground">Veterinarian</div>
                </div>
            </div>
        </div>

        {/* Секция данных Ветеринара */}
        {role === 'vet' && (
            <div className="bg-success/10 p-4 rounded-lg mb-6 border border-green-100 animate-fade-in">
                <h3 className="text-green-800 font-semibold mb-3 text-sm">Veterinarian Details</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-foreground mb-1">City</label>
                        <input 
                            type="text" 
                            className="w-full border border-border rounded p-2 text-sm text-foreground"
                            placeholder="Berlin"
                            value={details.city}
                            onChange={(e) => setDetails({...details, city: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Clinic Name</label>
                        <input 
                            type="text" 
                            className="w-full border border-border rounded p-2 text-sm text-foreground"
                            placeholder="Veterinary Clinic №1"
                            value={details.clinic_name}
                            onChange={(e) => setDetails({...details, clinic_name: e.target.value})}
                        />
                    </div>
                </div>
            </div>
        )}

        {/* Секция Пароля */}
        <div className="bg-muted p-4 rounded-lg mb-6 border border-border">
            <h3 className="text-foreground font-semibold mb-1 text-sm">Create Password</h3>
            <p className="text-xs text-muted-foreground mb-3">This is optional but will allow you to log in without Google.</p>
            <div className="space-y-3">
                <input 
                    type="password" 
                    className="w-full border border-border rounded p-2 text-sm text-foreground"
                    placeholder="New Password"
                    value={passwords.password}
                    onChange={(e) => setPasswords({...passwords, password: e.target.value})}
                />
                <input 
                    type="password" 
                    className="w-full border border-border rounded p-2 text-sm text-foreground"
                    placeholder="Confirm Password"
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})}
                />
            </div>
        </div>

        <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary transition shadow-md"
        >
            {loading ? 'Saving...' : 'Complete Setup'}
        </button>
      </div>
    </div>
  );
}