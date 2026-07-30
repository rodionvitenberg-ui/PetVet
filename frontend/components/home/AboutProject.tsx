"use client";

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { 
  Cloud, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  PawPrint,
  Syringe,
  ClipboardList,
  Stethoscope,
  Scissors,
  Heart
} from 'lucide-react';

const cardIcons = [
  <Cloud size={24} />,
  <FileText size={24} />,
  <ShieldCheck size={24} />,
];

// Decorative pet icons for floating background
const floatingIcons = [
  PawPrint, Heart, Syringe, ClipboardList, Stethoscope, Scissors
];

export const AboutProject = () => {
  const t = useTranslations('AboutProject');

  const features = [
    {
      icon: cardIcons[0],
      title: t('archive_title'),
      desc: t('archive_desc'),
      gradient: 'from-blue-500/20 to-cyan-500/10',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      borderGlow: 'group-hover:border-blue-400/40 group-hover:shadow-blue-500/10',
    },
    {
      icon: cardIcons[1],
      title: t('passport_title'),
      desc: t('passport_desc'),
      gradient: 'from-violet-500/20 to-purple-500/10',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-500',
      borderGlow: 'group-hover:border-violet-400/40 group-hover:shadow-violet-500/10',
    },
    {
      icon: cardIcons[2],
      title: t('security_title'),
      desc: t('security_desc'),
      gradient: 'from-emerald-500/20 to-teal-500/10',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      borderGlow: 'group-hover:border-emerald-400/40 group-hover:shadow-emerald-500/10',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring" as const, 
        stiffness: 100, 
        damping: 20 
      },
    },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6, 
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  };

  const subtitleVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6, 
        delay: 0.15,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  };

  return (
    <section id="about" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

        {/* Floating pet icons */}
        {floatingIcons.map((Icon, i) => (
          <motion.div
            key={i}
            className="absolute text-muted-foreground/5"
            style={{
              top: `${15 + (i * 12) % 70}%`,
              left: `${5 + (i * 18) % 90}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 6 + i * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.8,
            }}
          >
            <Icon size={24 + (i % 3) * 8} />
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16 md:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.div 
            variants={titleVariants}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20"
          >
            <PawPrint size={16} />
            <span>CareYourPet</span>
          </motion.div>

          <motion.h2 
            variants={titleVariants}
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight"
          >
            {t('title')}
          </motion.h2>
          
          <motion.p 
            variants={subtitleVariants}
            className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            {t('subtitle')}
          </motion.p>
        </motion.div>

        {/* Feature cards */}
        <motion.div 
          className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {features.map((feat, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              className={`group relative p-8 lg:p-10 rounded-2xl border border-border bg-card hover:shadow-xl transition-all duration-500 ${feat.borderGlow}`}
            >
              {/* Card gradient background on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              {/* Card content (relative to sit above gradient) */}
              <div className="relative z-10">
                {/* Icon container */}
                <div className={`w-14 h-14 rounded-xl ${feat.iconBg} ${feat.iconColor} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                  {feat.icon}
                </div>
                
                {/* Number indicator */}
                <div className="absolute top-0 right-0 text-6xl font-black text-muted-foreground/[0.04] select-none leading-none">
                  0{index + 1}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {feat.title}
                </h3>
                
                {/* Description */}
                <p className="text-muted-foreground leading-relaxed text-[15px]">
                  {feat.desc}
                </p>

                {/* Bottom accent line */}
                <div className={`mt-6 h-0.5 w-12 rounded-full bg-gradient-to-r from-current to-transparent ${feat.iconColor} opacity-30 group-hover:opacity-60 group-hover:w-full transition-all duration-500`} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <a
            href="#features"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group text-sm font-medium"
          >
            <span>Learn more about features</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};