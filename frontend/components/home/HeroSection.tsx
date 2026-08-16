"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import RotatingText from '@/components/RotatingText';
import { ArrowRight } from 'lucide-react';
import CreatePetModal from '@/components/dashboard/CreatePetModal';
import { Button } from '@/components/ui/button';

export const HeroSection = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <section className="relative flex h-screen min-h-[600px] w-full items-center justify-center overflow-hidden">
      {/* 1. VIDEO BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 z-10 bg-black/60" />

        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
          poster="/bg/bg1.jpg"
        >
          <source src="/assets/hero-video.mp4" type="video/mp4" />
        </video>
      </div>

      {/* 2. CONTENT (above video) */}
      <div className="container relative z-20 mx-auto px-4 text-center">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-8 text-5xl font-extrabold leading-tight tracking-tight text-white md:text-7xl">
            Built to help you care your <br className="hidden md:block" />
            <span className="ml-2 inline-flex h-[1.2em] items-center justify-center overflow-hidden align-middle md:ml-4">
              <RotatingText
                texts={['pet', 'dog', 'cat', 'rat', 'friend']}
                mainClassName="px-3 py-0.5 text-white overflow-hidden md:px-5"
                staggerFrom="last"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={2000}
              />
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg font-light text-gray-200 md:text-2xl">
            Create a digital profile, keep track of medical history and download
            a ready PDF passport for travel and doctor visits.
          </p>

          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Button
              size="lg"
              onClick={() => setIsCreateModalOpen(true)}
              className="group gap-2 text-lg"
            >
              Create pet profile
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 border-white/20 bg-white/10 text-lg text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
            >
              <Link href="#about">How it works</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative bottom gradient for smooth content transition */}
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-24 w-full bg-gradient-to-t from-black to-transparent" />
      <CreatePetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => setIsCreateModalOpen(false)}
      />
    </section>
  );
};