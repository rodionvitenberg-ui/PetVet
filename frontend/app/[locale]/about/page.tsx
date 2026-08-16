'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  PawPrint,
  User,
  Stethoscope,
  Building2,
  FileText,
  LayoutGrid,
  CalendarDays,
  Sparkles,
  MessageCircle,
  QrCode,
  CreditCard,
  Bell,
  MapPin,
} from 'lucide-react';

interface Role {
  title: string;
  desc: string;
}

interface Feature {
  title: string;
  desc: string;
}

export default function AboutPage() {
  const t = useTranslations('AboutPage');

  const roles = t.raw('roles') as unknown as Role[];
  const features = t.raw('features') as unknown as Feature[];
  const ownerSteps = t.raw('how_owner_steps') as unknown as string[];
  const vetSteps = t.raw('how_vet_steps') as unknown as string[];

  const roleIcons = [User, Stethoscope, Building2];
  const featureIcons = [
    FileText,
    LayoutGrid,
    CalendarDays,
    Sparkles,
    MessageCircle,
    QrCode,
    CreditCard,
    Bell,
    MapPin,
  ];

  return (
    <div className="min-h-screen bg-muted pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            <PawPrint size={16} />
            <span>careyour.pet</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
            {t('title')}
          </h1>
          <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* What is it */}
        <section className="bg-card rounded-3xl shadow-sm border border-border p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">{t('what_title')}</h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-4xl">
            {t('what_body')}
          </p>
        </section>

        {/* Roles */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">{t('roles_title')}</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {roles.map((role, i) => {
              const Icon = roleIcons[i] ?? User;
              return (
                <div key={role.title} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{role.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{role.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">{t('features_title')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => {
              const Icon = featureIcons[i] ?? Sparkles;
              return (
                <div key={feat.title} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How to use */}
        <section className="grid md:grid-cols-2 gap-5">
          <div className="bg-card rounded-2xl border border-border p-8">
            <h3 className="text-xl font-bold text-foreground mb-5">{t('how_owner_title')}</h3>
            <ol className="space-y-3">
              {ownerSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-muted-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8">
            <h3 className="text-xl font-bold text-foreground mb-5">{t('how_vet_title')}</h3>
            <ol className="space-y-3">
              {vetSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-muted-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-card rounded-3xl border border-border p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-6">{t('cta_title')}</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition"
            >
              {t('cta_button')}
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-muted px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/70 transition"
            >
              {t('cta_demo')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}