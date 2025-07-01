import React from 'react';
import { motion } from 'framer-motion';
import styles from './ProductSection.module.css';
import { Bot, Laptop as Laptop3 } from 'lucide-react';
import Container from './Container';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  videoSrc: string;
  delay: number;
}

const ProductSection: React.FC = () => {
  const features: FeatureProps[] = [
    {
      icon: <Bot className={styles.icon} />,
      title: "Taller del Estudiante: El Gimnasio Cognitivo",
      description: "Un espacio donde los estudiantes no buscan respuestas, las construyen. Nuestro andamio de IA socrática guía su razonamiento en laboratorios de habilidades y fomenta el pensamiento crítico dentro de proyectos auténticos.",
      videoSrc: "/Video_Profesor.mp4",
      delay: 0
    },
    {
      icon: <Laptop3 className={styles.icon} />,
      title: "Estudio del Docente: El Copiloto Pedagógico",
      description: "Deja de gestionar tareas y empieza a orquestar el aprendizaje. Diseña Proyectos de Aprendizaje impactantes, genera rúbricas y da feedback con una IA que es tu socia estratégica, no solo una asistente.",
      videoSrc: "/Video_Estudiante.mp4",
      delay: 0.1
    },
  ];

  return (
    <section id="product" className={styles.productSection}>
      <Container>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Una Plataforma, Dos Protagonistas
          </h2>
          <p className={styles.subtitle}>
            Herramientas de IA diseñadas para devolverle el poder al docente y entregarle la autonomía al estudiante.
          </p>
        </div>

        <div className={styles.featuresContainer}>
          {features.map((feature, index) => {
            const textContent = (
              <div className={styles.textBlock}>
                <div className={styles.iconWrapper}>
                  {feature.icon}
                </div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.description}>{feature.description}</p>
              </div>
            );

            const videoContent = (
              <div className={styles.videoContainer}>
                <div className={styles.videoGlow} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  <video 
                    className={styles.featureVideo}
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    key={feature.videoSrc}
                  >
                    <source src={feature.videoSrc} type="video/mp4" />
                  </video>
                </motion.div>
              </div>
            );

            return (
              <motion.div 
                key={index} 
                className={styles.featureRow}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: feature.delay }}
              >
                {index % 2 === 0 ? (
                  <>
                    {textContent}
                    {videoContent}
                  </>
                ) : (
                  <>
                    {videoContent}
                    {textContent}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

export default ProductSection;