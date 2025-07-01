import React from 'react';
import { motion } from 'framer-motion';
import styles from './ProductSection.module.css';
import { Bot, Laptop as Laptop3 } from 'lucide-react'; // Puedes cambiar los iconos si lo deseas
import Container from './Container';

// La interfaz de props no cambia
interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const ProductSection: React.FC = () => {
  // AQUÍ ESTÁ LA ACTUALIZACIÓN ESTRATÉGICA DEL CONTENIDO
  const features: FeatureProps[] = [
    {
      icon: <Bot className={styles.icon} />, // Icono para el estudiante
      title: "Taller del Estudiante: El Gimnasio Cognitivo",
      description: "Un espacio donde los estudiantes no buscan respuestas, las construyen. Nuestro andamio de IA socrática guía su razonamiento en laboratorios de habilidades y fomenta el pensamiento crítico dentro de proyectos auténticos.",
      delay: 0
    },
    {
      icon: <Laptop3 className={styles.icon} />, // Icono para el docente
      title: "Estudio del Docente: El Copiloto Pedagógico",
      description: "Deja de gestionar tareas y empieza a orquestar el aprendizaje. Diseña Proyectos de Aprendizaje impactantes, genera rúbricas y da feedback con una IA que es tu socia estratégica, no solo una asistente.",
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

        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={styles.featureCard}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: feature.delay }}
            >
              <div className={styles.iconWrapper}>
                {feature.icon}
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.description}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default ProductSection;