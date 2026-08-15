"use client";

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import {
  Cloud,
  FileText,
  ShieldCheck,
  ArrowRight,
  PawPrint,
} from 'lucide-react';

export const AboutProject = () => {
  const t = useTranslations('AboutProject');

  const features = [
    {
      icon: <Cloud size={20} />,
      title: t('archive_title'),
      desc: t('archive_desc'),
    },
    {
      icon: <FileText size={20} />,
      title: t('passport_title'),
      desc: t('passport_desc'),
    },
    {
      icon: <ShieldCheck size={20} />,
      title: t('security_title'),
      desc: t('security_desc'),
    },
  ];

  return (
    <section id="about" className="relative py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-14 md:mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            <PawPrint size={16} />
            <span>CareYourPet</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
            {t('title')}
          </h2>

          <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6 max-w-6xl mx-auto">
          {features.map((feat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
              className="group relative p-7 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-5">
                {feat.icon}
              </div>

              <h3 className="text-lg font-bold text-foreground mb-2">
                {feat.title}
              </h3>

              <p className="text-[15px] text-muted-foreground leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-14"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <a
            href="#features"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group text-sm font-medium"
          >
            <span>{t('learn_more')}</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};