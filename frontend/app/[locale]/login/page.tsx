'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { Loader2, User, Lock, Eye, EyeOff, LogIn, PawPrint } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';

function LoginForm() {
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

      if (!res.ok) throw new Error('Invalid username or password');
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
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold text-foreground lg:hidden mb-1">Welcome Back</h1>
        <h1 className="text-2xl font-extrabold text-foreground hidden lg:block mb-1">Welcome Back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to manage your pets and appointments
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3.5 rounded-xl mb-6 border border-destructive/20 flex items-start gap-2">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}
      
      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <User size={18} className="text-muted-foreground" />
            </div>
            <input
              type="text" required
              value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-input rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition placeholder:text-muted-foreground/50"
              placeholder="Enter your username"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock size={18} className="text-muted-foreground" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'} required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-input rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition placeholder:text-muted-foreground/50"
              placeholder="Enter your password"
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

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <LogIn size={20} />
          )}
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-border" />
        <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm">or continue with</span>
        <div className="flex-grow border-t border-border" />
      </div>

      {/* Google */}
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
            } catch (e) {
              setError('Error during Google authentication');
            }
          }}
          onError={() => setError('Error connecting to Google')}
          useOneTap
        />
      </div>

      {/* Demo link */}
      <div className="mt-6 text-center">
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 transition bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl border border-amber-200"
        >
          <PawPrint size={16} />
          Try Demo Account
        </Link>
      </div>

      {/* Register link */}
      <div className="mt-4 text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <Link href="/register" className="text-primary hover:underline font-semibold hover:text-primary/80 transition">
          Create account
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