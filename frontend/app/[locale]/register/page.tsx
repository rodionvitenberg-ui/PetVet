'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { addToast } from '@heroui/toast';
import AuthLayout from '@/components/auth/AuthLayout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function RegisterForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      const msg = 'Passwords do not match';
      setError(msg);
      addToast({ title: 'Error', description: msg, color: 'danger', variant: 'flat' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data === 'object' 
            ? Object.values(data).flat().join(', ') 
            : 'Registration error';
        throw new Error(errorMsg);
      }

      addToast({ 
          title: 'Account created!', 
          description: 'Check your email for activation', 
          color: 'success', 
          variant: 'flat' 
      });
      setIsSuccess(true);

    } catch (err: any) {
      const msg = err.message || 'An error occurred';
      setError(msg);
      addToast({ title: 'Registration Error', description: msg, color: 'danger', variant: 'flat' });
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full text-center py-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
          <Mail size={32} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          We have sent an activation link to <br/>
          <span className="font-semibold text-foreground">{formData.email}</span>. 
          <br/>Click the link to complete your registration.
        </p>
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-primary font-bold hover:text-primary/80 transition py-3 px-6 rounded-xl hover:bg-primary/5"
        >
          Return to Login <ArrowRight size={18}/>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold text-foreground mb-1">Create Account</h1>
        <p className="text-muted-foreground text-sm">
          Join the platform and start caring for your pets digitally
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3.5 rounded-xl mb-6 border border-destructive/20 flex items-start gap-2">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Username</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <User size={18} className="text-muted-foreground" />
            </div>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full pl-10 pr-4 py-3 border border-input rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition placeholder:text-muted-foreground/50"
              placeholder="Choose a username"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail size={18} className="text-muted-foreground" />
            </div>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full pl-10 pr-4 py-3 border border-input rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition placeholder:text-muted-foreground/50"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock size={18} className="text-muted-foreground" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-10 pr-12 py-3 border border-input rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition placeholder:text-muted-foreground/50"
                placeholder="******"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock size={18} className="text-muted-foreground" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                className="w-full pl-10 pr-12 py-3 border border-input rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition placeholder:text-muted-foreground/50"
                placeholder="******"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link href="/login" className="text-primary hover:underline font-semibold hover:text-primary/80 transition">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}