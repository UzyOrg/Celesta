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
      className="bg-white/5 backdrop-blur-sm rounded-2xl p-8"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-turquoise to-lime flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className={`${headingStyles.h4} mb-3 text-white`}>{title}</h3>
      <p className={`${textStyles.body} ${opacityVariants.secondary}`}>{description}</p>
    </motion.div>
  );
};

const ProductSection: React.FC = () => {
  const features: FeatureProps[] = [
    {
      icon: <Bot className="w-6 h-6 text-white" />,
      title: "Tutor Socrático IA 24/7",
      description: "Fomenta el pensamiento crítico con un tutor IA que guía a los estudiantes mediante preguntas, promoviendo un aprendizaje profundo y autónomo.",
      delay: 0
    },
    {
      icon: <Award className="w-6 h-6 text-white" />,
      title: "Métricas de Aprendizaje Reales",
      description: "Visualiza el progreso y comprende las necesidades de tus estudiantes con datos claros y accionables, facilitando una enseñanza más personalizada.",
      delay: 0.1
    },
    {
      icon: <Laptop3 className="w-6 h-6 text-white" />,
      title: "Copiloto IA para Educadores",
      description: "Optimiza tu tiempo con IA que asiste en la planificación, creación de contenido y evaluación, permitiéndote enfocarte en lo que más importa: enseñar.",
      delay: 0.2
    },
    {
      icon: <Brain className="w-6 h-6 text-white" />,
      title: "IA Ética Centrada en el Humano",
      description: "Nuestra IA, desarrollada con transparencia y equidad, está diseñada para potenciar la invaluable conexión humana en la educación.",
      delay: 0.3
    }
  ];

  return (
    <section id="product" className="pt-24 pb-24">
      <Container>
        <div className="border-t border-[#1A1E26]/80 pt-16">
          <div className="text-center mb-16">
            <div className="relative">
              <span className="absolute -z-10 inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(5,247,255,0.35)_0%,_transparent_60%)] blur-[80px] opacity-0 motion-safe:animate-fadeGlow"></span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className={`${headingStyles.h2} text-[clamp(2.8rem,6vw,5rem)] leading-[1.1] tracking-tight mb-6`}
              >
                IA Inteligente para Potenciar la{" "}
                <span className="bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
                  Enseñanza
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
              Descubre herramientas IA diseñadas como tu copiloto, un tutor socrático para estudiantes y un generador de métricas que enriquecen la labor educativa.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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