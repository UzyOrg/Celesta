import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';
import Container from './Container';
import Button from './Button';
import { headingStyles, textStyles } from '../styles/typography';
import { useModal } from '@/context/ModalContext';

const CTASection: React.FC = () => {
  const { openLeadModal } = useModal();
  return (
    <>
    <section className="pt-16 sm:pt-20 md:pt-24 pb-16 sm:pb-20 md:pb-24">
      <Container>
        <div className="border-t border-[#1A1E26]/80 pt-16">
          <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 overflow-hidden">
            <div className="absolute top-0 right-0 h-1 w-1/3 bg-gradient-to-r from-turquoise to-lime" />
            <div className="absolute bottom-0 left-0 h-1 w-1/3 bg-gradient-to-r from-lime to-turquoise" />
            
            <div className="max-w-3xl mx-auto text-center">
              <div className="relative">
                <span className="absolute -z-10 inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(5,247,255,0.35)_0%,_transparent_60%)] blur-[80px] opacity-0 motion-safe:animate-fadeGlow"></span>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className={`${headingStyles.h2} text-[clamp(2.8rem,6vw,5rem)] leading-[1.1] tracking-tight mb-4 sm:mb-6`}
                >
                  ¿Listo para{" "}
                  <span className="bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
                    Transformar la Educación
                  </span>
                  {" "}en tu Institución?
                </motion.h2>
              </div>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className={`${textStyles.largeBody} mb-6 sm:mb-8 text-white/90`}
              >
                Únete a la vanguardia de la innovación educativa en México. Descubre cómo nuestra plataforma docente-first, con su Copiloto Inteligente, Tutor Socrático IA y el Skill-Graph, está ayudando a educadores como tú a ahorrar tiempo, profundizar el aprendizaje y evidenciar el impacto real. Es momento de co-crear el futuro.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
              >
                <div className="w-full sm:w-auto">
                  <Button size="lg" onClick={openLeadModal}>
                    Solicita Demo Piloto <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                <div className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="border-white/20 text-white">
                    <Mail className="mr-2 w-4 h-4" /> Conocer Más
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Container>
    </section>
    </>
  );
};

export default CTASection;