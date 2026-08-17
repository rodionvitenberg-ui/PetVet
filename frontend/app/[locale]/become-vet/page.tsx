'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/providers/AuthProvider';
import { Check, ChevronLeft, Sparkles, Stethoscope, MessageSquareText, ShieldCheck } from 'lucide-react';
import { createCheckoutSession } from '@/services/subscriptionService';

export default function BecomeVetPage() {
    const router = useRouter();
    const { isAuth } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations('BecomeVet');

    const handleSubscribe = async () => {
        if (!isAuth) {
            router.push('/login');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const { checkout_url } = await createCheckoutSession();
            window.location.href = checkout_url;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to start checkout');
            setIsSubmitting(false);
        }
    };

    const features = [
        { icon: Stethoscope, title: t('feature_patients_title'), desc: t('feature_patients_desc') },
        { icon: MessageSquareText, title: t('feature_ai_title'), desc: t('feature_ai_desc') },
        { icon: ShieldCheck, title: t('feature_invoices_title'), desc: t('feature_invoices_desc') },
    ];

    return (
        <div className="min-h-screen relative pt-24 pb-10 px-4">
            <div className="absolute inset-0 bg-[url('/bg/bg1.jpg')] bg-cover bg-center bg-no-repeat bg-fixed z-0" />
            <div className="absolute inset-0 bg-black/60 z-0" />
            <div className="relative z-10 max-w-3xl mx-auto">
                <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition">
                    <ChevronLeft size={20} /> <span>Go Back</span>
                </button>

                <div className="bg-card rounded-[2rem] shadow-xl border border-border p-8 md:p-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Sparkles size={24} />
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
                            {t('badge')}
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t('title')}</h1>
                    <p className="text-lg text-muted-foreground mb-8">{t('subtitle')}</p>

                    <div className="grid md:grid-cols-3 gap-4 mb-8">
                        {features.map((f) => (
                            <div key={f.title} className="p-4 rounded-2xl border border-border bg-background/50">
                                <f.icon className="text-primary mb-3" size={24} />
                                <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
                                <p className="text-sm text-muted-foreground">{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="p-5 rounded-2xl border border-success/20 bg-success/5 mb-8">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-foreground">$5</span>
                            <span className="text-muted-foreground">{t('per_month')}</span>
                        </div>
                        <div className="mt-3 space-y-2">
                            {[t('plan_include_1'), t('plan_include_2'), t('plan_include_3')].map((line) => (
                                <div key={line} className="flex items-start gap-2 text-sm text-foreground">
                                    <Check size={18} className="text-success shrink-0 mt-0.5" />
                                    <span>{line}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubscribe}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Processing...' : t('cta')}
                    </button>
                    <p className="text-center text-xs text-muted-foreground mt-3">{t('cancel_anytime')}</p>
                </div>
            </div>
        </div>
    );
}