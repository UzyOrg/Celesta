import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';
import Container from './Container';
import Button from './Button';
import { headingStyles, textStyles } from '../styles/typography';
import { useRouter } from 'next/navigation';
import styles from './CTASection.module.css'; // Import the CSS module

const CTASection: React.FC = () => {
  const router = useRouter();
  return (
    <>
      <section className={styles.ctaSection}>
        <Container>
          <div className={styles.borderContainer}>
            <div className={styles.contentWrapper}>
              <div className={styles.topGradient} />
              <div className={styles.bottomGradient} />
              
              <div className={styles.textContainer}>
                <div className={styles.headingContainer}>
                  <span className={styles.glow}></span>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className={`${headingStyles.h2} ${styles.heading}`}
                  >
                    ¿Listo para{" "}
                    <span className={styles.gradientText}>
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
                  className={`${textStyles.largeBody} ${styles.paragraph}`}
                >
                  Únete a la vanguardia de la innovación educativa en México. Descubre cómo nuestra plataforma docente-first, con su Copiloto Inteligente, Tutor Socrático IA y el Skill-Graph, está ayudando a educadores como tú a ahorrar tiempo, profundizar el aprendizaje y evidenciar el impacto real. Es momento de co-crear el futuro.
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  className={styles.buttonContainer}
                >
                  <div className={styles.buttonWrapper}>
                    <Button size="lg" onClick={() => router.push('/questionnaire')}>
                      Solicita Demo Piloto <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                  <div className={styles.buttonWrapper}>
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