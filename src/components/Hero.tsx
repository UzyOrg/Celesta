import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useScroll } from 'framer-motion';
import { Sparkles, Play } from 'lucide-react';
import Container from './Container';
import Button from './Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Hero.module.css';

const Hero: React.FC = () => {
  const router = useRouter();

  // Removed carousel logic as per user request

  const controls = useAnimation();
  const { scrollY } = useScroll();
  const particlesRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const particles: HTMLDivElement[] = [];
    if (particlesRef.current) {
      for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'absolute rounded-full bg-gradient-to-r from-turquoise to-lime opacity-20 blur-sm';
        particle.style.width = `${Math.random() * 20 + 10}px`;
        particle.style.height = particle.style.width;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particlesRef.current.appendChild(particle);
        particles.push(particle);
        
        animate(particle);
      }
    }
    
    function animate(particle: HTMLDivElement) {
      const duration = Math.random() * 3000 + 2000;
      const xDistance = (Math.random() - 0.5) * 100;
      const yDistance = (Math.random() - 0.5) * 100;
      
      particle.animate([
        { transform: 'translate(0, 0)', opacity: 0 },
        { transform: `translate(${xDistance}px, ${yDistance}px)`, opacity: 0.5, offset: 0.5 },
        { transform: 'translate(0, 0)', opacity: 0 }
      ], {
        duration,
        iterations: Infinity,
        easing: 'ease-in-out'
      });
    }
    
    return () => {
      particles.forEach(p => p.remove());
    };
  }, []);

  useEffect(() => {
    return scrollY.onChange(latest => {
      controls.start({ y: latest * 0.5 });
    });
  }, [controls, scrollY]);

  return (
    <>
      <section className={styles.heroSection}>
      <div ref={particlesRef} className={styles.particlesContainer} />
      
      <Container>
        <div className={styles.contentWrapper}>
          <motion.div 
            className={styles.motionDiv}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.badge}>
              <span className={styles.badgeText}>
                <Sparkles className={styles.sparklesIcon} /> 
                El Sistema Operativo para el Aula Moderna.
              </span>
            </div>
            
            <div className="relative">
              <span className={`${styles.glow} motion-safe:animate-fadeGlow`}></span>
              <h1 className={styles.title}>
                <span className={styles.titleWhite}>
                  El primer sistema operativo
                </span>
                <br />
                <span className={styles.titleGradient}>
                  pedagógico.
                </span>
              </h1>
            </div>
            
            <p className={styles.subtitle}>
              Un tema. Un Proyecto de Aprendizaje. Orquestado.
            </p>
            
            <div className={styles.buttonContainer}>
              <div className={styles.buttonWrapper}>
                <Button size="lg" className={styles.fullWidth} onClick={() => router.push('/questionnaire')}>
                  Solicita Demo Piloto
                </Button>
              </div>
              <div className={styles.buttonWrapper}>
                <Link href="/demo/start" passHref className={styles.buttonLink}>
                  <Button variant="outline" size="lg" className={`${styles.fullWidth} ${styles.exploreButton}`}>
                    <Play className={styles.playIcon} />
                    Ver demo piloto
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
    
    </>
  );
};

export default Hero;