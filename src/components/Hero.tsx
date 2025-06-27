import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useScroll } from 'framer-motion';
import { Sparkles, Play } from 'lucide-react';
import Container from './Container';
import Button from './Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
      <section className="relative pt-24 pb-10 sm:pt-48 sm:pb-32 md:pt-64 md:pb-48 overflow-hidden">
      <div ref={particlesRef} className="absolute inset-0 pointer-events-none" />
      
      <Container>
        <div className="mx-auto relative z-10">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center px-3 py-1 text-xs xs:text-sm sm:text-base mb-3 xs:mb-4 sm:mb-6 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
              <span className="text-white/90">
                <Sparkles className="inline h-4 w-4 mr-2 text-turquoise" /> 
                El Sistema Operativo para el Aula Moderna.
              </span>
            </div>
            
            <div className="relative">
              <span className="absolute -z-10 inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(5,247,255,0.35)_0%,_transparent_60%)] blur-[80px] opacity-0 motion-safe:animate-fadeGlow"></span>
              <h1 className="text-[clamp(2.2rem,8vw,5rem)] font-bold leading-[1.1] tracking-tight mb-4 xs:mb-6">
                <span className="text-white">
                  El primer sistema operativo
                </span>
                <br />
                <span className="bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
                  pedagógico.
                </span>
              </h1>
            </div>
            
            <p className="text-base sm:text-xl md:text-2xl text-white/80 mb-5 sm:mb-8 max-w-2xl mx-auto px-4">
              Un tema. Un Proyecto de Aprendizaje. Orquestado.
            </p>
            
            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
              <div className="w-full sm:w-auto">
                <Button size="lg" className="w-full" onClick={() => router.push('/questionnaire')}>
                  Solicita Demo Piloto
                </Button>
              </div>
              <div className="w-full sm:w-auto">
                <Link href="/demo/start" passHref className="w-full block">
                  <Button variant="outline" size="lg" className="w-full group">
                    <Play className="w-4 h-4 mr-2 text-turquoise group-hover:text-white transition-colors" />
                    Explora Nuestra IA
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