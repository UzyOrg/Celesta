'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Container from '@/components/Container';
import { motion } from 'framer-motion';
import { headingStyles, textStyles } from '@/styles/typography';
import Button from '@/components/Button'; // Added Button import

// Mock data for the lesson plan
const mockPlan = {
  objetivo: "Que los estudiantes comprendan y apliquen el concepto de fracciones equivalentes para resolver problemas.",
  estructura: [
    "Introducción (5 min): Presentar el concepto de 'partes de un todo'.",
    "Modelado (10 min): Mostrar con ejemplos visuales cómo 1/2 es igual a 2/4.",
    "Práctica Guiada (15 min): Resolver 3 problemas en conjunto.",
    "Práctica Independiente (10 min): Los alumnos resuelven 5 ejercicios.",
    "Cierre (5 min): Repaso rápido y ticket de salida."
  ],
  rubrica: [
    { criterio: "Comprensión del Concepto", nivel: "Identifica y crea fracciones equivalentes." },
    { criterio: "Aplicación en Problemas", nivel: "Usa las fracciones para resolver situaciones dadas." },
    { criterio: "Participación", nivel: "Colabora activamente en la práctica guiada." },
  ]
};

const DemoTeacherPage: React.FC = () => {
  const [plan, setPlan] = useState<typeof mockPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('fracciones');

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/plan', { method: 'POST' });
      const data = await response.json();
      setPlan(data);
    } catch (error) {
      console.error('Error fetching plan:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen py-16 overflow-hidden">
      {/* Gradient Glow Background - Spans full width */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_top_center,_rgba(5,247,255,0.15)_0%,_transparent_50%)] opacity-70 motion-safe:animate-pulseSlow"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_bottom_center,_rgba(163,230,53,0.1)_0%,_transparent_60%)] opacity-60 motion-safe:animate-pulseSlowDelay"></div>
      </div>

      {/* Content constrained by Container */}
      <Container className="z-10">
        <div className="text-center">
        <h1 className={`${headingStyles.h1} mb-2`}>Copiloto Docente</h1>
        <p className={`${textStyles.largeBody} text-white/70 max-w-2xl mx-auto mb-8`}>
          Ahorra horas de planeación. Elige un tema y genera una estructura de clase y rúbrica en segundos.
        </p>
      </div>

      {!plan ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto p-8 text-center bg-neutral-800/60 backdrop-blur-lg border border-neutral-700/80 shadow-xl rounded-xl">
          <h3 className={`${headingStyles.h3} mb-4`}>Selecciona un Tema</h3>
          <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="select select-bordered w-full mb-6 bg-neutral-700/60 border-neutral-600 text-white/90 focus:border-turquoise focus:ring-turquoise rounded-lg py-3 px-4"
              >
            <option value="fracciones">Fracciones Equivalentes</option>
            <option value="binomios" disabled>Binomios al Cuadrado (próximamente)</option>
            <option value="fotosintesis" disabled>La Fotosíntesis (próximamente)</option>
          </select>
          <Button variant="primary" className="w-full" onClick={handleGeneratePlan} disabled={loading}>
            {loading ? 'Generando...' : 'Generar Plan de Clase'}
          </Button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
          {/* Plan de Clase Generado and Objetivo Section (Full Width) */}
          <div>
            <h2 className={`font-plus-jakarta-sans font-bold leading-tight tracking-tight text-2xl sm:text-3xl md:text-4xl text-lime mb-3 text-center`}>Plan de Clase Generado</h2>
            <h3 className={`font-plus-jakarta-sans font-bold leading-snug tracking-tight text-xl sm:text-2xl md:text-3xl mb-2`}>Objetivo:</h3>
            <div className="p-6 bg-neutral-800/60 backdrop-blur-lg border border-neutral-700/80 shadow-xl rounded-xl">
              <p className={`${textStyles.body} text-white/80`}>{plan?.objetivo}</p>
            </div>
          </div>

          {/* Button Section (Moved Up) */}
          <div className="text-center">
            <Link href="/demo/summary?from=teacher" passHref>
                <Button variant="primary" size="lg">Ver mi Impacto &rarr;</Button>
            </Link>
          </div>

          {/* Estructura and Rúbrica Sections (Stacked Vertically) */}
          <div className="space-y-8">
            {/* Estructura Sugerida Section (Vertical Timeline) */}
            <div>
              <h3 className={`font-plus-jakarta-sans font-bold leading-snug tracking-tight text-xl sm:text-2xl md:text-3xl mb-2`}>Estructura Sugerida:</h3>
              <div className="p-6 bg-neutral-800/60 backdrop-blur-lg border border-neutral-700/80 shadow-xl rounded-xl">
                <div className="space-y-0">
                  {plan?.estructura?.map((item, index, arr) => (
                    <div key={index} className="relative flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-turquoise to-lime ring-4 ring-cyan-400/40 ${index === 0 ? 'mt-1' : ''}`}></div>
                        {index < arr.length - 1 && (
                          <div className="flex-grow w-0.5 bg-neutral-600 mt-1"></div>
                        )}
                      </div>
                      <div className={`pb-8 ${index === 0 ? 'pt-0.5' : ''} flex-grow`}>
                        <p className={`${textStyles.body} text-white/80`}>{item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rúbrica de Evaluación Section (Table) */}
            <div>
              <h3 className={`font-plus-jakarta-sans font-bold leading-snug tracking-tight text-xl sm:text-2xl md:text-3xl mb-2`}>Rúbrica de Evaluación:</h3>
              <div className="overflow-x-auto p-6 bg-neutral-800/60 backdrop-blur-lg border border-neutral-700/80 shadow-xl rounded-xl">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className='text-white/90 text-left py-2 px-3'>Criterio</th>
                      <th className='text-white/90 text-left py-2 px-3'>Nivel Esperado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan?.rubrica?.map((item, i) => (
                      <tr key={i} className="hover:bg-white/10 border-t border-neutral-700">
                        <td className={`${textStyles.body} text-white/80 py-3 px-3`}>{item.criterio}</td>
                        <td className={`${textStyles.body} text-white/80 py-3 px-3`}>{item.nivel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>

      )}
      </Container>
    </div>
  );
};

export default DemoTeacherPage;
