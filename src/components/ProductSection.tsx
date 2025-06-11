import React from 'react';
import { motion } from 'framer-motion';
import { headingStyles, textStyles, opacityVariants } from '../styles/typography';
import { Bot, Award, Laptop as Laptop3, Brain } from 'lucide-react';
import Container from './Container';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 sm:p-8"
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-turquoise to-lime flex items-center justify-center mb-4 sm:mb-6">
        {icon}
      </div>
      <h3 className="text-md sm:text-lg font-semibold mb-2 sm:mb-3 text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-white/75">{description}</p>
    </motion.div>
  );
};

const ProductSection: React.FC = () => {
  const features: FeatureProps[] = [
    {
      icon: <Bot className="w-6 h-6 text-white" />,
      title: "Tutor IA: Álgebra y Soft-Skills",
      description: "Acompaña el aprendizaje desde Álgebra I con hints escalonados hasta el desarrollo de soft-skills como la resiliencia. Fomenta el pensamiento crítico con IA que guía, no solo entrega respuestas.",
      delay: 0
    },
    {
      icon: <Award className="w-6 h-6 text-white" />,
      title: "Impacto Medible: Skill-Graph y OB3",
      description: "Visualiza competencias con el Skill-Graph, implementa evaluaciones auténticas (proyectos + defensa oral) y emite micro-credenciales OB3 con QR verificable, co-firmadas por universidades. Conecta el aprendizaje a resultados y ROI.",
      delay: 0.1
    },
    {
      icon: <Laptop3 className="w-6 h-6 text-white" />,
      title: "Copiloto Docente: Planificación y Evaluación IA",
      description: "Ahorra hasta un 30% de tu tiempo. Genera planes de clase (45 min) y rúbricas completas alineadas a SEP. Nuestro dashboard \"semáforo\" detecta la frustración estudiantil y sugiere intervenciones oportunas.",
      delay: 0.2
    },
    {
      icon: <Brain className="w-6 h-6 text-white" />,
      title: "Tecnología Segura: Online y Offline",
      description: "Nuestro modelo Llama-3-EduMX y el Kit Edge-School (opera offline con <2s de latencia) garantizan acceso y soberanía de datos. Cumplimos con LFPDPPP, sin trackers y con panel de sesgo, para una IA responsable y confiable.",
      delay: 0.3
    }
  ];

  return (
    <section id="product" className="pt-16 sm:pt-20 md:pt-24 pb-16 sm:pb-20 md:pb-24">
      <Container>
        <div className="border-t border-[#1A1E26]/80 pt-16">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <div className="relative">
              <span className="absolute -z-10 inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(5,247,255,0.35)_0%,_transparent_60%)] blur-[80px] opacity-0 motion-safe:animate-fadeGlow"></span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className={`${headingStyles.h2} text-[clamp(2.4rem,6vw,5rem)] leading-[1.1] tracking-tight mb-4 sm:mb-6`}
              >
                Nuestra Plataforma Docente-First en{" "}
                <span className="bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
                  Acción.
                </span>
              </motion.h2>
            </div>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className={`${textStyles.largeBody} max-w-3xl mx-auto ${opacityVariants.secondary}`}
            >
              En Celestea, creemos en potenciar tu labor con tecnología que comprende tus desafíos. Te ofrecemos soluciones intuitivas que se integran a tu flujo de trabajo, permitiéndote enfocarte en lo esencial: inspirar y guiar a tus estudiantes.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <Feature key={index} {...feature} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default ProductSection;