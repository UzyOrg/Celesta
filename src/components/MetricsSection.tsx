import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { headingStyles, textStyles, opacityVariants } from '../styles/typography';
import { TrendingUp } from 'lucide-react';
import Container from './Container';

interface MetricProps {
  value: number;
  unit: string;
  label: string;
  delay: number;
}

const Metric: React.FC<MetricProps> = ({ value, unit, label, delay }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let startValue = 0;
          const duration = 2000;
          const increment = Math.ceil(value / (duration / 16));
          
          const timer = setInterval(() => {
            startValue += increment;
            if (startValue >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(startValue);
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [value, hasAnimated]);

  return (
    <motion.div
      ref={elementRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className={`${headingStyles.h2} text-4xl md:text-5xl leading-[1.1] tracking-tight mb-2`}>
        {count}
        <span className="text-turquoise">{unit}</span>
      </div>
      <p className={`${textStyles.body} ${opacityVariants.secondary}`}>{label}</p>
    </motion.div>
  );
};

const MetricsSection: React.FC = () => {
  const metrics: MetricProps[] = [
    { value: 30, unit: '%', label: 'Menos Tiempo en Tareas Operativas para Docentes', delay: 0 },
    { value: 85, unit: '%', label: 'Mejora en la Comprensión de Conceptos Clave', delay: 0.1 },
    { value: 100, unit: '%', label: 'Visibilidad del Desarrollo de Competencias (Skill-Graph)', delay: 0.2 },
    { value: 20, unit: '%', label: 'Incremento en Participación Activa del Estudiante', delay: 0.3 },
  ];

  return (
    <section className="pt-24 pb-24">
      <Container>
        <div className="border-t border-[#1A1E26]/80 pt-16">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm mb-4"
            >
              <TrendingUp className="w-4 h-4 mr-2 text-turquoise" />
              <span className={`${textStyles.button} ${opacityVariants.primary}`}>Evidencia de Progreso</span>
            </motion.div>
            
            <div className="relative">
              <span className="absolute -z-10 inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(5,247,255,0.35)_0%,_transparent_60%)] blur-[80px] opacity-0 motion-safe:animate-fadeGlow"></span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className={`${headingStyles.h2} text-[clamp(2.8rem,6vw,5rem)] leading-[1.1] tracking-tight mb-6`}
              >
                Evidenciando la{" "}
                <span className="bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
                  Transformación Educativa
                </span>.
              </motion.h2>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {metrics.map((metric, index) => (
              <Metric key={index} {...metric} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default MetricsSection;