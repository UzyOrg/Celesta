'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Container from '@/components/Container';
import { motion } from 'framer-motion';
import { textStyles } from '@/styles/typography';
import Button from '@/components/Button';

const SummaryPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const isTeacher = from === 'teacher';

  // Define content based on the user type
  const title = isTeacher
    ? "El Fin de los Domingos de Planeación"
    : "Progreso en el Tema"; // Fallback for student
  
  const description = isTeacher
    ? "Nuestro copiloto diseña proyectos de aprendizaje impactantes en minutos, no horas, para que recuperes tu tiempo."
    : "Con el Tutor guiado, no solo resuelves problemas, sino que construyes una comprensión profunda."; // Fallback for student

  const metricValue = "80%"; // Only for student view now

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Gradient Glow Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_top_center,_rgba(167,216,245,0.15)_0%,_transparent_50%)] opacity-70 motion-safe:animate-pulseSlow"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_bottom_center,_rgba(217,210,247,0.1)_0%,_transparent_60%)] opacity-60 motion-safe:animate-pulseSlowDelay"></div>
      </div>

      {/* Content */}
      <Container className="z-10 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="p-8 md:p-12 rounded-2xl max-w-2xl w-full text-center bg-black/50 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-cyan-500/20"
        >
          {isTeacher ? (
            <>
              <h2 className={`font-plus-jakarta-sans font-bold leading-tight tracking-tight text-2xl sm:text-3xl text-white mb-4`}>
                {title}
              </h2>
              <p className={`font-plus-jakarta-sans text-sm leading-relaxed text-white/70 mb-8 max-w-lg mx-auto`}>{description}</p>
            </>
          ) : (
            <>
              <p className={`font-plus-jakarta-sans font-bold leading-tight tracking-tight text-4xl sm:text-5xl lg:text-6xl bg-gradient-to-r from-[var(--color-crystal-blue)] to-[var(--color-crystal-lavender)] bg-clip-text text-transparent text-center mb-2`}>{metricValue}</p>
              <p className={`font-plus-jakarta-sans font-bold leading-snug tracking-tight text-xl sm:text-2xl lg:text-3xl text-center mb-4`}>{title}</p>
              <p className={`font-plus-jakarta-sans text-sm leading-relaxed text-white/70 mb-8 max-w-lg mx-auto`}>{description}</p>
            </>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/questionnaire')}
          >
            Quiero Pilotar en mi Escuela
          </Button>
        </motion.div>
      </Container>
    </div>
  );
};

export default SummaryPageContent;