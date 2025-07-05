import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Play } from 'lucide-react';
import Container from './Container';
import Button from './Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import styles from './Hero.module.css';

declare global {
  interface Window {
    UnicornStudio: any;
  }
}

const Hero: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    if (typeof window.UnicornStudio !== 'undefined') {
      window.UnicornStudio.addScene({
        elementId: 'unicorn-canvas',
        projectId: 'eMyj7N4NgblbFC5pdaWZ',
      });
    }
  }, []);

  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.27/dist/unicornStudio.umd.js"
        strategy="lazyOnload"
        onLoad={() => {
          if (typeof window.UnicornStudio !== 'undefined') {
            window.UnicornStudio.addScene({
              elementId: 'unicorn-canvas',
              projectId: 'eMyj7N4NgblbFC5pdaWZ',
            });
          }
        }}
      />
      
      <section className={styles.heroSection}>
      <div id="unicorn-canvas" className={styles.particlesContainer} />
      <div className={styles.gradientOverlay} />
      
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
                <Button variant="gradient" size="lg" className={styles.fullWidth} onClick={() => router.push('/questionnaire')}>
                  Únete a la whitelist
                </Button>
              </div>
              <div className={styles.buttonWrapper}>
                <Link href="/demo/start" passHref className={styles.buttonLink}>
                  <Button variant="outline" size="lg" className={`${styles.fullWidth} ${styles.exploreButton}`}>
                    <Play className={styles.playIcon} />
                    Probar demo piloto
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