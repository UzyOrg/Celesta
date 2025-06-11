'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Container from '@/components/Container';
import { motion, AnimatePresence } from 'framer-motion';
import { headingStyles, textStyles } from '@/styles/typography';
import Button from '@/components/Button'; // Added Button import

const hints = [
  "Recuerda, para factorizar un trinomio de la forma x² + bx + c, buscas dos números que multiplicados den 'c' y sumados den 'b'.",
  "En este caso, 'c' es 6 y 'b' es -5. ¿Qué dos números negativos multiplicados dan +6 y sumados dan -5?",
  "Los números son -2 y -3. Por lo tanto, la factorización es (x - 2)(x - 3)."
];

const DemoStudentPage: React.FC = () => {
  const [currentHint, setCurrentHint] = useState(-1);

  const showNextHint = () => {
    if (currentHint < hints.length - 1) {
      setCurrentHint(currentHint + 1);
    }
  };

  const isSolved = currentHint === hints.length - 1;

  return (
    <div className="relative min-h-screen py-16 flex flex-col items-center justify-center overflow-hidden">
      {/* Gradient Glow Background - Spans full width */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_top_center,_rgba(5,247,255,0.15)_0%,_transparent_50%)] opacity-70 motion-safe:animate-pulseSlow"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_bottom_center,_rgba(163,230,53,0.1)_0%,_transparent_60%)] opacity-60 motion-safe:animate-pulseSlowDelay"></div>
      </div>

      {/* Content constrained by Container */}
      <Container className="z-10 flex flex-col items-center">
        <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2"><span className="text-neutral-300">Tutor</span> <span className="text-turquoise-400">Personalizado</span></h1>
        <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
          Resuelve problemas paso a paso con la guía de nuestra IA. Aprende a tu ritmo y fortalece tu comprensión.
        </p>
      </div>

      <motion.div layout className="w-full max-w-xl p-4 sm:p-6 md:p-8 shadow-xl bg-neutral-800/60 backdrop-blur-lg border border-neutral-700/80 rounded-xl">
        <h3 className={`font-plus-jakarta-sans font-bold leading-snug tracking-tight text-lg sm:text-xl md:text-2xl lg:text-3xl mb-4 text-center text-white`}>Problema a Resolver:</h3>
        <p className={`text-center text-turquoise-400 font-mono text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-6 bg-neutral-900/70 p-3 sm:p-4 rounded-lg`}>x² – 5x + 6</p>
        
        <div className="space-y-3 sm:space-y-4 mb-6 min-h-[120px] sm:min-h-[150px]">
          <AnimatePresence>
            {currentHint >= 0 && hints.slice(0, currentHint + 1).map((hint, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                className={`${index === hints.length - 1 ? 'bg-green-400/30 border border-green-400/50' : 'bg-neutral-800/90 border border-neutral-700'} rounded-xl p-3 sm:p-4 shadow-md`}>
                <p className="text-sm sm:text-base text-neutral-200">
                  <span className={`font-semibold ${index === hints.length - 1 ? 'text-lime-400' : 'text-turquoise-400'}`}>
                    {index === hints.length - 1 ? 'Explicación Final: ' : `Pista ${index + 1}: `}
                  </span>
                  {hint}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!isSolved ? (
          <Button variant="secondary" className="w-full" onClick={showNextHint}>
            Necesito una pista
          </Button>
        ) : (
          <div className='text-center'>
            <p className='text-lime-400 mb-4'>¡Excelente! Lo resolviste.</p>
            <Link href={`/demo/summary?from=student&hints=${currentHint}`} passHref>
              <Button variant="primary" size="lg">Ver mi Progreso &rarr;</Button>
            </Link>
          </div>
        )}
      </motion.div>
      </Container>
    </div>
  );
};

export default DemoStudentPage;
