"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import RotatingText from '@/components/RotatingText';
import { ArrowRight } from 'lucide-react';
import CreatePetModal from '@/components/dashboard/CreatePetModal';

export const HeroSection = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      
      {/* 1. ВИДЕО ФОН */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/60 z-10" />
        
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          // Замени на путь к твоему файлу в папке public
          poster="/bg/bg1.jpg" // Картинка-заглушка, пока видео грузится
        >
          <source src="/assets/hero-video.mp4" type="video/mp4" />
        </video>
      </div>

      {/* 2. КОНТЕНТ (Z-Index выше видео) */}
      <div className="container relative z-20 mx-auto px-4 text-center">
        
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-8 text-white tracking-tight leading-tight">
            Built to help you care your <br className="hidden md:block" />
            <span className="inline-flex items-center justify-center align-middle h-[1.2em] overflow-hidden ml-2 md:ml-4">
               {/* 3. АНИМАЦИЯ ТЕКСТА */}
               <RotatingText
                  texts={['pet', 'dog', 'cat', 'rat', 'friend']}
                  mainClassName="text-white px-3 md:px-5 overflow-hidden py-0.5"
                  staggerFrom="last"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "-120%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  rotationInterval={2000}
                />
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto font-light">
            Create a digital profile, keep track of medical history and download 
            a ready PDF passport for travel and doctor visits.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="group px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-full transition-all shadow-lg hover:shadow-blue-500/50 flex items-center gap-2"
            >
              Create pet profile
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <Link 
              href="#about" 
              className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-lg font-semibold rounded-full transition-all border border-white/20"
            >
              How it works
            </Link>
          </div>
        </div>

      </div>
      
      {/* Декоративный градиент снизу, чтобы переход в контент был мягким */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
      <CreatePetModal 
         isOpen={isCreateModalOpen}
         onClose={() => setIsCreateModalOpen(false)}
         onSuccess={() => setIsCreateModalOpen(false)}
         />
    </section>
  );
};