'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PawPrint, ShieldOff } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function DemoLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loginAsDemo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/demo-login/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Demo login failed (${res.status})`);
        }

        const data = await res.json();

        localStorage.setItem('access_token', data.tokens.access);
        localStorage.setItem('refresh_token', data.tokens.refresh);

        setStatus('success');

        // Redirect to dashboard after a brief moment
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);

      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Could not connect to demo account.');
      }
    };

    loginAsDemo();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card rounded-3xl shadow-2xl shadow-primary/20/30 border border-border p-10 text-center">

        {status === 'loading' && (
          <>
            <div className="mx-auto w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center mb-6">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground mb-2">
              Entering Demo Mode
            </h1>
            <p className="text-muted-foreground text-sm">
              Signing you in to the demo account...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mb-6">
              <PawPrint size={32} className="text-success" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground mb-2">
              Welcome to the Demo!
            </h1>
            <p className="text-muted-foreground text-sm">
              Redirecting to dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-6">
              <ShieldOff size={32} className="text-destructive" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground mb-2">
              Demo Unavailable
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              {errorMsg}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                Go to Login
              </Link>
              <Link
                href="/register"
                className="w-full bg-muted text-foreground py-3 rounded-xl font-semibold hover:bg-muted transition-all"
              >
                Create Account
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}