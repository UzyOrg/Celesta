'use client';

import React from 'react';
import Link from 'next/link';
import Container from '@/components/Container';
import { motion } from 'framer-motion';
import { headingStyles, textStyles } from '@/styles/typography';
import Button from '@/components/Button'; // Added Button import

const DemoStartPage: React.FC = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Gradient Glow Background - Spans full width */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_top_center,_rgba(5,247,255,0.15)_0%,_transparent_50%)] opacity-70 motion-safe:animate-pulseSlow"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_bottom_center,_rgba(163,230,53,0.1)_0%,_transparent_60%)] opacity-60 motion-safe:animate-pulseSlowDelay"></div>
      </div>

      {/* Content constrained by Container */}
      <Container className="z-10">
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className={`${headingStyles.h1} mb-4`}>Elige tu Aventura de Aprendizaje</h1>
        <p className={`${textStyles.largeBody} text-white/70 max-w-2xl mx-auto mb-8`}>
          Experimenta el poder de nuestra IA desde la perspectiva que más te interese. ¿Quieres ahorrar tiempo como educador o recibir una guía inteligente como estudiante?
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/demo/teacher" passHref>
            <Button variant="primary" size="lg" className="w-full sm:w-auto">Soy Docente</Button>
          </Link>
          <Link href="/demo/student" passHref>
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">Soy Alumno</Button>
          </Link>
        </div>
        </motion.div>
      </Container>
    </div>
  );
};

export default DemoStartPage;
