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
      icon: <Laptop3 className="w-6 h-6 text-white" />,
      title: "Copiloto IA para Docentes",
      description: "Diseña proyectos de aprendizaje, crea instrumentos de evaluación y ofrece retroalimentación personalizada en una fracción del tiempo. Libera tu potencial pedagógico.",
      delay: 0.1
    },
  ];

  return (
    <section id="product" className="py-16 sm:py-20 bg-[#0D1117]">
      <Container>
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Una plataforma, dos revoluciones
          </h2>
          <p className="mt-4 text-lg sm:text-xl text-white/70">
            Hemos creado herramientas de IA que fortalecen el rol del docente y potencian el aprendizaje auténtico del alumno.
          </p>
        </div>

        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="mb-6 inline-block p-4 bg-white/5 rounded-lg">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-white/70">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default ProductSection;