'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, UserCheck, TrendingUp, Shield } from 'lucide-react';
import styles from './Manifiesto.module.css';
import ManifestoCard from './ManifestoCard';

const manifestoData = [
  {
    icon: <UserCheck />,
    title: 'Empoderar, no Reemplazar',
    description: 'Nuestra IA es un copiloto para el docente, automatizando lo tedioso para que puedan enfocarse en lo que aman: enseñar y conectar.',
  },
  {
    icon: <BrainCircuit />,
    title: 'Fomentar el Razonamiento',
    description: 'Creamos tutores socráticos que guían al estudiante a través de preguntas, construyendo pensamiento crítico en lugar de solo dar respuestas.',
  },
  {
    icon: <TrendingUp />,
    title: 'Métricas para la Maestría',
    description: 'Vamos más allá de la calificación. Proveemos data accionable sobre el dominio de competencias, revelando el verdadero progreso del aprendizaje.',
  },
  {
    icon: <Shield />,
    title: 'Construir con Ética',
    description: 'Desarrollamos tecnología con un profundo sentido de responsabilidad, asegurando que la IA sirva a la humanidad y proteja la integridad del aula.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const ManifiestoSection = () => {
  return (
    <section className={styles.sectionContainer}>
      <h2 className={styles.mainHeadline}>
        No estamos creando otra herramienta. Estamos sentando las bases de una nueva era educativa.
      </h2>
      <p className={styles.subHeadline}>
        En un mundo saturado de IA que ofrece respuestas fáciles, nosotros nos obsesionamos con hacer las preguntas correctas. Creemos que el futuro de México no depende de cuánta información memorizamos, sino de nuestra capacidad para razonar, crear y resolver problemas complejos. Por eso construimos Celestea. Esta es nuestra convicción:
      </p>
      <motion.div
        className={styles.gridContainer}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {manifestoData.map((item, index) => (
          <ManifestoCard
            key={index}
            icon={item.icon}
            title={item.title}
            description={item.description}
          />
        ))}
      </motion.div>
    </section>
  );
};

export default ManifiestoSection;
