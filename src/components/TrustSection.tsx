import React from 'react';
import { motion } from 'framer-motion';
import { textStyles, headingStyles, opacityVariants } from '../styles/typography';
import { ShieldCheck } from 'lucide-react';
import Container from './Container';

const trustLogos = [
  { name: 'Escuela Pública Innovadora', delay: 0 },
  { name: 'Colegio Privado Pionero', delay: 0.1 },
  { name: 'Universidad Aliada (OB3)', delay: 0.2 },
  { name: 'Clúster Industrial (Nearshoring)', delay: 0.3 },
  { name: 'Sello IA Responsable MX', delay: 0.4 },
];

const TrustSection: React.FC = () => {
  return (
    <section
      className="py-12 sm:py-16 md:py-24"
    >
      <Container>
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <ShieldCheck className={`w-8 h-8 sm:w-10 sm:h-10 ${opacityVariants.primary} mx-auto mb-3 sm:mb-4 text-turquoise`} />
          <h2 className={`${headingStyles.h2} ${opacityVariants.primary} text-white`}>
            Alianzas Estratégicas para una Educación Transformadora.
          </h2>
          <p className={`${textStyles.largeBody} ${opacityVariants.secondary} mt-4 max-w-3xl mx-auto`}>
            Colaboramos activamente con instituciones educativas pioneras, universidades y líderes de la industria para co-diseñar el futuro del aprendizaje en México. Desde los primeros talleres con docentes hasta la emisión de micro-credenciales OB3 y la vinculación con el sector productivo, construimos juntos un ecosistema de confianza e innovación.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-8 items-center">
          {trustLogos.map((logo, index) => (
            <div
              key={logo.name}
              className={`flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-lg bg-black/20 backdrop-blur-sm border border-white/30 hover:bg-white/10 hover:border-white/50 transition-all duration-300`}
            >
              {/* Placeholder for actual logos - using text for now */}
              {/* <img src={`/logos/${logo.name.toLowerCase().replace(/\s+/g, '-')}.svg`} alt={logo.name} className="h-12 mb-2 filter grayscale hover:grayscale-0 transition-all" /> */}
              <span className={`text-xs sm:text-sm text-neutral-200 font-medium`}>
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default TrustSection;