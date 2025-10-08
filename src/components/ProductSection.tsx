import React from 'react';
import { motion } from 'framer-motion';
import styles from './ProductSection.module.css';
import { Bot, Laptop as Laptop3 } from 'lucide-react';
import Container from './Container';
import Image from 'next/image';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  imageSrc: string;
  delay: number;
}

const ProductSection: React.FC = () => {
  const features: FeatureProps[] = [
    {
      icon: <Bot className={styles.icon} />,
      title: "Taller del Estudiante: Aprende Haciendo",
      description: "Talleres interactivos donde la IA socrática acompaña cada paso del estudiante. Resuelve casos reales, analiza situaciones y construye conocimiento con retroalimentación inteligente en tiempo real.",
      imageSrc: "/student_workshop.png",
      delay: 0
    },
    {
      icon: <Laptop3 className={styles.icon} />,
      title: "Panel del Docente: Visibilidad Total",
      description: "Monitorea el progreso en tiempo real, identifica patrones de aprendizaje y toma decisiones pedagógicas basadas en datos. Gestiona tus grupos y visualiza métricas de autonomía y participación desde un solo lugar.",
      imageSrc: "/teacher_dashboard.png",
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

            const imageContent = (
              <div className={styles.videoContainer}>
                <div className={styles.videoGlow} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  style={{ position: 'relative', zIndex: 1 }}
                >
                  <Image
                    src={feature.imageSrc}
                    alt={feature.title}
                    width={1200}
                    height={800}
                    className={styles.featureVideo}
                    priority={index === 0}
                  />
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
                    {imageContent}
                  </>
                ) : (
                  <>
                    {imageContent}
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