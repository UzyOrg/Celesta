import React from 'react';
import { motion } from 'framer-motion';
import { textStyles, headingStyles, opacityVariants } from '../styles/typography';
import { ShieldCheck } from 'lucide-react';
import Container from './Container';

const trustLogos = [
  { name: 'University Partner', delay: 0 },
  { name: 'Tech Company', delay: 0.1 },
  { name: 'Educational Institute', delay: 0.2 },
  { name: 'Research Center', delay: 0.3 },
  { name: 'Industry Leader', delay: 0.4 },
];

const TrustSection: React.FC = () => {
  const sectionAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const logoAnimation = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (custom: number) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: custom * 0.15 + 0.3, duration: 0.4 }, // Staggered delay
    }),
  };

  return (
    <motion.section
      className="py-16 md:py-24 bg-opacity-50 backdrop-filter backdrop-blur-lg border border-gray-700/50 rounded-xl shadow-xl"
      variants={sectionAnimation}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <Container>
        <div className="text-center mb-12 md:mb-16">
          <ShieldCheck className={`w-10 h-10 ${opacityVariants.primary} mx-auto mb-4 text-turquoise`} />
          <h2 className={`${headingStyles.h2} ${opacityVariants.primary}`}>
            Unidos para Impulsar la Evolución Educativa
          </h2>
          <p className={`${textStyles.largeBody} ${opacityVariants.secondary} mt-4 max-w-3xl mx-auto`}>
            Junto a instituciones y empresas visionarias, co-creamos el futuro del aprendizaje. Implementamos IA que fortalece la labor docente y enriquece la experiencia educativa, asegurando un desarrollo profesional significativo y resultados medibles.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-8 items-center">
          {trustLogos.map((logo, index) => (
            <motion.div
              key={logo.name}
              className={`flex flex-col items-center justify-center text-center p-4 rounded-lg bg-gray-800/60 hover:bg-gray-700/80 transition-colors duration-300`}
              custom={index}
              variants={logoAnimation}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
            >
              {/* Placeholder for actual logos - using text for now */}
              {/* <img src={`/logos/${logo.name.toLowerCase().replace(/\s+/g, '-')}.svg`} alt={logo.name} className="h-12 mb-2 filter grayscale hover:grayscale-0 transition-all" /> */}
              <span className={`${textStyles.small} ${opacityVariants.primary} font-medium`}>
                {logo.name}
              </span>
            </motion.div>
          ))}
        </div>
      </Container>
    </motion.section>
  );
};

export default TrustSection;