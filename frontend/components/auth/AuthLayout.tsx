'use client';

import { motion } from 'motion/react';
import { PawPrint, Cloud, FileText, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const benefits = [
  { icon: Cloud, text: 'Digital Archive', desc: 'Medical records in the cloud' },
  { icon: FileText, text: 'PDF Passport', desc: 'One-click health report' },
  { icon: ShieldCheck, text: 'Full Control', desc: 'Share via QR code' },
];

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-muted/30 border-r border-border items-center justify-center p-12">
        <motion.div 
          className="relative z-10 max-w-lg"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <PawPrint size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">careyour.pet</h1>
              <p className="text-sm text-muted-foreground">{"Your pet's digital companion"}</p>
            </div>
          </div>

          {/* Hero text */}
          <h2 className="text-4xl font-extrabold text-foreground leading-tight mb-4">
            Everything you need<br />
            <span className="text-primary">to care your pet</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            Digital passports, medical records, AI consultations, and smart tools —<br />
            all in one platform.
          </p>

          {/* Benefits list */}
          <div className="space-y-6">
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{benefit.text}</p>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </motion.div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative">
        {/* Mobile brand (visible only on small screens) */}
        <motion.div 
          className="absolute top-6 left-1/2 -translate-x-1/2 lg:hidden flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <PawPrint size={18} className="text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">careyour.pet</span>
        </motion.div>

        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}