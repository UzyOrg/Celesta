import React from 'react';
import { motion } from 'framer-motion';
import Container from './Container';
import { headingStyles, textStyles, opacityVariants } from '../styles/typography';
import { Lightbulb, BarChartBig, ShieldCheck, Globe } from 'lucide-react'; // Icons for phases

interface RoadmapPhaseProps {
  icon: React.ReactNode;
  title: string;
  duration: string;
  achievements: string[];
  impact: string;
  delay: number;
}

const RoadmapPhase: React.FC<RoadmapPhaseProps> = ({ icon, title, duration, achievements, impact, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, amount: 0.3 }}
      className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 shadow-lg flex flex-col h-full" // Added flex flex-col h-full for consistent card height
    >
      <div className="flex items-center mb-4">
        <span className="text-turquoise mr-3">{icon}</span>
        <h3 className={`${headingStyles.h3} text-xl font-semibold`}>{title}</h3>
      </div>
      <p className={`${textStyles.small} text-white/60 mb-3 font-medium`}>{duration}</p>
      <div className="flex-grow"> {/* This will make the list take available space */}
        <ul className="list-disc list-inside mb-4 space-y-1.5">
          {achievements.map((ach, index) => (
            <li key={index} className={`${textStyles.body} ${opacityVariants.secondary}`}>{ach}</li>
          ))}
        </ul>
      </div>
      <div> {/* This div ensures impact text is at the bottom if cards have different content lengths */}
        <p className={`${textStyles.body} font-semibold ${opacityVariants.primary} mb-1`}>Impacto Esperado:</p>
        <p className={`${textStyles.body} ${opacityVariants.secondary}`}>{impact}</p>
      </div>
    </motion.div>
  );
};

const RoadMapSection: React.FC = () => {
  const phases: RoadmapPhaseProps[] = [
    {
      icon: <Lightbulb size={28} />,
      title: "Fase 1: Cimientos y Primeros Pilotos",
      duration: "Meses 0-4",
      achievements: [
        "Lanzamiento MVP del Copiloto Docente (Planificación y Evaluación).",
        "Lanzamiento MVP del Tutor Socrático IA (Álgebra).",
        "Incorporación de las primeras escuelas piloto.",
        "Validación del modelo Llama-3-EduMX."
      ],
      impact: "Herramientas esenciales en manos de los educadores, retroalimentación temprana y mejora continua.",
      delay: 0.1
    },
    {
      icon: <BarChartBig size={28} />,
      title: "Fase 2: Evidencia del Aprendizaje e Impacto Inicial",
      duration: "Meses 5-8",
      achievements: [
        "Desarrollo del Skill-Graph MVP para visualización de competencias.",
        "Implementación del Dashboard Semáforo para detección de frustración.",
        "Emisión de la primera insignia Open Badge 3.0 co-firmada con universidad aliada."
      ],
      impact: "Medición tangible del progreso estudiantil, intervenciones pedagógicas proactivas y credenciales verificables con valor curricular.",
      delay: 0.2
    },
    {
      icon: <ShieldCheck size={28} />,
      title: "Fase 3: Soberanía Tecnológica y Alianzas Estratégicas",
      duration: "Meses 9-12",
      achievements: [
        "Despliegue del Kit Edge-School para operación online/offline.",
        "Implementación del panel de sesgo para IA Responsable.",
        "Consolidación de acuerdos con clústeres industriales.",
        "Expansión a 5 universidades aliadas.",
        "Definición del modelo de pricing final."
      ],
      impact: "Acceso equitativo a la tecnología, IA ética y transparente, y una fuerte vinculación entre la educación y las necesidades del sector productivo.",
      delay: 0.3
    },
    {
      icon: <Globe size={28} />,
      title: "Fase 4: Expansión de Capacidades y Visión Global",
      duration: "Meses 13-18+",
      achievements: [
        "Ampliación del Tutor Socrático IA para cubrir soft-skills.",
        "Plena operatividad del sistema de Micro-credenciales OB3.",
        "Inicio de la estrategia de internacionalización en LATAM.",
        "Desarrollo del marketplace de contenidos educativos."
      ],
      impact: "Formación integral del estudiante, un ecosistema de credenciales robusto y el posicionamiento de Celestea AI como referente en EdTech regional.",
      delay: 0.4
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-opacity-30"> {/* Optional: slightly different bg for visual separation */}
      <Container>
        <div className="text-center mb-12 md:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className={`${headingStyles.h2} mb-4`}
          >
            Construyendo el Futuro de la Educación,{" "}
            <span className="bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
              Paso a Paso.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className={`${textStyles.largeBody} ${opacityVariants.secondary} max-w-3xl mx-auto`}
          >
            En Celestea AI, estamos comprometidos con una evolución constante y transparente. Nuestro roadmap refleja nuestra dedicación a desarrollar soluciones innovadoras que empoderen a docentes y transformen la experiencia de aprendizaje, siempre en colaboración con la comunidad educativa.
          </motion.p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 items-stretch"> {/* Added items-stretch for consistent card height */}
          {phases.map((phase) => (
            <RoadmapPhase key={phase.title} {...phase} />
          ))}
        </div>
      </Container>
    </section>
  );
};

export default RoadMapSection;
