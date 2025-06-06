import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useScroll } from 'framer-motion';
import { Sparkles, Play } from 'lucide-react';
import Container from './Container';
import Button from './Button';
import LeadModal from './LeadModal';

const Hero: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
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
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <div ref={particlesRef} className="absolute inset-0 pointer-events-none" />
      
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          <motion.div 
            className="lg:col-span-7 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center px-3 py-1.5 mb-6 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
              <span className="text-white/90">
                <Sparkles className="inline h-4 w-4 mr-2 text-turquoise" /> 
                Plataforma Docente-First.
              </span>
            </div>
            
            <div className="relative">
              <span className="absolute -z-10 inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(5,247,255,0.35)_0%,_transparent_60%)] blur-[80px] opacity-0 motion-safe:animate-fadeGlow"></span>
              <h1 className="text-[clamp(2.8rem,6vw,5rem)] font-bold leading-[1.1] tracking-tight mb-6">
                <span className="bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
                  Transformemos el futuro
                </span>
                <span className="text-white">
                  {" "}con una Mejor Educación.
                </span>
              </h1>
            </div>
            
            <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-2xl mx-auto lg:mx-0">
              Redefinamos la educación, midamos el cambio y acompañemos el aprendizaje con IA responsable.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button size="lg" onClick={openModal}>
                Solicita Demo Piloto
              </Button>
              <Button variant="outline" size="lg" className="group">
                <Play className="w-4 h-4 mr-2 text-turquoise group-hover:text-white transition-colors" />
                Explora Nuestra IA
              </Button>
            </div>
          </motion.div>
          
          <motion.div 
            className="lg:col-span-5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-turquoise to-lime opacity-20 blur-2xl rounded-full" />
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden aspect-[4/3]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-turquoise to-lime flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-lg font-medium text-white/90">IA al Servicio del Educador</p>
                    <p className="text-sm text-white/70">Copiloto Inteligente y Tutoría Socrática</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
    <LeadModal open={isModalOpen} onClose={closeModal} />
    </>
  );
};

export default Hero;