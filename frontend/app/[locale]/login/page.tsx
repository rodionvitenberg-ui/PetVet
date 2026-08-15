'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslations } from 'next-intl';
import { Loader2, User, Lock, Eye, EyeOff, LogIn, PawPrint } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';

function LoginForm() {
  const t = useTranslations('Auth');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error(t('invalid_credentials'));
      const data = await res.json();
      
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      const target = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
      window.location.href = target;
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold text-foreground mb-1">{t('welcome_back')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('subtitle')}
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3.5 rounded-xl mb-6 border border-destructive/20 flex items-start gap-2">
          <span className="font-medium">{t('error_prefix')}</span> {error}
        </div>
      )}
      
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            {t('username')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <User size={18} className="text-muted-foreground" />
            </div>
            <input
              type="text" required
              value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-input rounded-xl bg-background text-foreground text-sm focus-ring transition placeholder:text-muted-foreground/50"
              placeholder={t('username_placeholder')}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            {t('password')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock size={18} className="text-muted-foreground" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'} required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-input rounded-xl bg-background text-foreground text-sm focus-ring transition placeholder:text-muted-foreground/50"
              placeholder={t('password_placeholder')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.96]"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <LogIn size={20} />
          )}
          {isLoading ? t('signing_in') : t('sign_in')}
        </button>
      </form>

      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-border" />
        <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm">{t('or_continue_with')}</span>
        <div className="flex-grow border-t border-border" />
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            try {
              const res = await fetch(`${API_URL}/api/auth/google/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error('Google auth failed');
              
              localStorage.setItem('access_token', data.tokens.access);
              localStorage.setItem('refresh_token', data.tokens.refresh);

              if (data.is_new_user) {
                window.location.href = '/onboarding';
              } else {
                const target = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
                window.location.href = target;
              }
            } catch {
              setError(t('google_failed'));
            }
          }}
          onError={() => setError(t('google_connection_error'))}
          useOneTap
        />
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition bg-muted hover:bg-muted/80 px-4 py-2 rounded-xl border border-border"
        >
          <PawPrint size={16} />
          {t('try_demo')}
        </Link>
      </div>

      <div className="mt-4 text-center text-sm">
        <span className="text-muted-foreground">{t('no_account')} </span>
        <Link href="/register" className="text-primary hover:underline font-semibold hover:text-primary/80 transition">
          {t('create_account')}
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}