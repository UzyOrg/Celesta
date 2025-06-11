'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useModal } from '@/context/ModalContext';
import Container from '@/components/Container';
import { motion } from 'framer-motion';
import { headingStyles, textStyles } from '@/styles/typography';
import { Clock, BarChart2 } from 'lucide-react';
import Button from '@/components/Button';

const SummaryPageContent: React.FC = () => {
  const { openLeadModal } = useModal();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const isTeacher = from === 'teacher';
  // const metricIcon = isTeacher ? <Clock size={48} /> : <BarChart2 size={48} />;
  const metricValue = isTeacher ? "12" : "80%";
  const metricLabel = isTeacher ? "Horas Ahorradas al Mes" : "Progreso en el Tema";
  const message = isTeacher
    ? "Con el Copiloto, recuperas tiempo valioso para enfocarte en lo que más importa: tus estudiantes."
    : "Con el Tutor guiado, no solo resuelves problemas, sino que construyes una comprensión profunda.";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Gradient Glow Background - Spans full width */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_top_center,_rgba(5,247,255,0.15)_0%,_transparent_50%)] opacity-70 motion-safe:animate-pulseSlow"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_bottom_center,_rgba(163,230,53,0.1)_0%,_transparent_60%)] opacity-60 motion-safe:animate-pulseSlowDelay"></div>
      </div>

      {/* Content constrained by Container */}
      <Container className="z-10 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="p-8 md:p-12 rounded-2xl max-w-2xl w-full bg-neutral-800/60 backdrop-blur-lg border border-neutral-700/80 shadow-xl"
        >
          {/* Icon can be re-added if needed, ensure it's handled correctly with isTeacher logic */}
          {/* {metricIcon} */}
          <p className={`font-plus-jakarta-sans font-bold leading-tight tracking-tight text-4xl sm:text-5xl lg:text-6xl bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent text-center mb-2`}>{metricValue}</p>
          <p className={`font-plus-jakarta-sans font-bold leading-snug tracking-tight text-xl sm:text-2xl lg:text-3xl text-center mb-4`}>{metricLabel}</p>
          <p className={`${textStyles.largeBody} text-white/70 mb-8`}>{message}</p>

          <Button
            variant="primary"
            size="lg"
            onClick={openLeadModal}
          >
            Quiero Pilotar en mi Escuela
          </Button>
        </motion.div>
      </Container>
    </div>
  );
};

export default SummaryPageContent;
