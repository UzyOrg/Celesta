'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Container from '@/components/Container';
import Button from '@/components/Button';
import styles from './DemoStartPage.module.css';

const DemoStartPage: React.FC = () => {
  return (
    <div className={styles.pageWrapper}>
      {/* Gradient Glow Background - Spans full width */}


      {/* Content constrained by Container */}
      <Container className="z-10">
        <motion.div
          className={styles.contentBox}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className={styles.pageTitle}>Elige tu Aventura de Aprendizaje</h1>
          <p className={styles.pageSubtitle}>
            Experimenta el poder de nuestra IA desde la perspectiva que más te interese. ¿Quieres ahorrar tiempo como educador o recibir una guía inteligente como estudiante?
          </p>
          <div className={styles.actionsContainer}>
            <Link href="/demo/teacher" passHref>
              <Button variant="primary" size="lg" className="w-full sm:w-auto">Soy Docente</Button>
            </Link>
            <Link href="/demo/student" passHref>
              <Button variant="primary" size="lg" className="w-full sm:w-auto">Soy Alumno</Button>
            </Link>
          </div>
        </motion.div>
      </Container>
    </div>
  );
};

export default DemoStartPage;
