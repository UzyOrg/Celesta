import React from 'react';
import { motion } from 'framer-motion';
import Container from './Container';
import { headingStyles, textStyles, opacityVariants } from '../styles/typography';
import { Lightbulb, BarChartBig, ShieldCheck, Globe, CheckCircle2 } from 'lucide-react'; // Icons for phases, added CheckCircle2

interface RoadmapPhaseProps {
  icon: React.ReactNode;
  title: string;
  duration: string;
  achievements: string[];
  delay: number;
}

const RoadmapPhase: React.FC<RoadmapPhaseProps> = ({ icon, title, duration, achievements, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, amount: 0.3 }}
      className="bg-black/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-white/30 hover:bg-white/10 hover:border-white/50 shadow-lg flex flex-col h-full"
    >
      <div className="flex items-start mb-1"> {/* Align icon with potential multi-line title better */}
        <span className="text-turquoise-400 mr-2 sm:mr-3 mt-1 flex-shrink-0">{React.cloneElement(icon as React.ReactElement, { size: 24, className: 'sm:hidden' })}{React.cloneElement(icon as React.ReactElement, { size: 28, className: 'hidden sm:inline' })}</span>
        <h3 className="text-lg sm:text-xl font-bold text-neutral-100 leading-tight">{title}</h3>
      </div>
      <p className="text-2xs sm:text-xs text-turquoise-400 uppercase tracking-wider mb-3 sm:mb-4 pl-8 sm:pl-10">{duration}</p> {/* Adjusted margin to align with title text if icon is present */}
      <div className="flex-grow">
        <ul className="space-y-3">
          {achievements.map((ach, index) => (
            <li key={index} className={`flex items-start text-sm sm:text-base text-neutral-300 leading-relaxed`}>
              <CheckCircle2 size={16} className="text-lime mr-2 sm:mr-2.5 mt-1 flex-shrink-0 sm:hidden" /><CheckCircle2 size={18} className="text-lime mr-2 sm:mr-2.5 mt-1 flex-shrink-0 hidden sm:inline" />
              <span>{ach}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};

const RoadMapSection: React.FC = () => {
  const phases: RoadmapPhaseProps[] = [
    {
      icon: <Lightbulb size={28} />,
      title: "Ponemos la IA al servicio del maestro y del alumno",
      duration: "Fase 1 · Hoy",
      achievements: [
        "El maestro obtiene un asistente que prepara la clase y corrige tareas por él.",
        "El alumno recibe preguntas guiadas que le ayudan a entender, no a copiar.",
        "Todo el progreso queda registrado y es visible en un panel sencillo."
      ],
      delay: 0.1
    },
    {
      icon: <BarChartBig size={28} />,
      title: "Modelo propio + acceso sin internet",
      duration: "Fase 2 · Próximos 6 meses",
      achievements: [
        "Entrenamos nuestra propia IA con ejemplos de escuelas mexicanas: más barata y adaptada al programa oficial.",
        "Llevamos la plataforma a zonas sin conexión con un pequeño servidor portátil.",
        "Al terminar cada tema, el alumno gana una insignia digital avalada por la universidad aliada."
      ],
      delay: 0.2
    },
    {
      icon: <ShieldCheck size={28} />,
      title: "Escalamos y creamos comunidad",
      duration: "Fase 3 · De 6 a 18 meses",
      achievements: [
        "Los profesores podrán compartir sus mini-cursos y ganar ingresos.",
        "Las empresas verán directamente las habilidades certificadas de los alumnos y les ofrecerán prácticas o empleo.",
        "Incorporamos laboratorios virtuales para que practiquen procesos de la industria cuando la base anterior esté consolidada."
      ],
      delay: 0.3
    }
  ];

  return (
    <section id="roadmap" className="py-12 sm:py-16 md:py-24"> {/* Optional: slightly different bg for visual separation */}
      <Container>
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className={`${headingStyles.h2} mb-3 pb-3 sm:mb-4 sm:pb-4`}
          >
            Creando un camino responsable para la Educación
            <span className="bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
             {" "} Paso a Paso.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className={`${textStyles.largeBody} ${opacityVariants.secondary} max-w-3xl mx-auto`}
          >
            Nuestro roadmap refleja nuestra dedicación a desarrollar soluciones innovadoras que empoderen a docentes y transformen la experiencia de aprendizaje, siempre en colaboración con la comunidad educativa.
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch"> {/* Added items-stretch for consistent card height */}
          {phases.map((phase) => (
            <RoadmapPhase key={phase.title} {...phase} />
          ))}
        </div>
      </Container>
    </section>
  );
};

export default RoadMapSection;
