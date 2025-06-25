import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Users } from 'lucide-react';
import Container from './Container';

const MetricsSection: React.FC = () => {
  return (
    <section id="metrics" className="py-16 sm:py-20 bg-[#0D1117]">
      <Container>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
              Métricas que importan,
              <br />
              <span className="bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
                no que aparentan.
              </span>
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-white/70">
              Olvídate de las tasas de finalización. Nuestra plataforma mide el desarrollo de habilidades clave del siglo XXI, ofreciendo una visión clara del aprendizaje real y accionable.
            </p>
            <ul className="mt-8 space-y-4 text-left">
              <motion.li 
                className="flex items-start"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="p-2 bg-white/10 rounded-full mr-4 shrink-0">
                  <Target className="w-6 h-6 text-turquoise" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Pensamiento Crítico</h4>
                  <p className="text-white/70 text-sm">Analizamos la capacidad del alumno para construir argumentos sólidos y evaluar información.</p>
                </div>
              </motion.li>
              <motion.li 
                className="flex items-start"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="p-2 bg-white/10 rounded-full mr-4 shrink-0">
                  <TrendingUp className="w-6 h-6 text-lime" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Resolución de Problemas</h4>
                  <p className="text-white/70 text-sm">Medimos cómo se aplica el conocimiento para resolver desafíos complejos y auténticos.</p>
                </div>
              </motion.li>
              <motion.li 
                className="flex items-start"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="p-2 bg-white/10 rounded-full mr-4 shrink-0">
                  <Users className="w-6 h-6 text-turquoise" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Colaboración</h4>
                  <p className="text-white/70 text-sm">Evaluamos la efectividad del trabajo en equipo y la comunicación dentro de los proyectos.</p>
                </div>
              </motion.li>
            </ul>
          </div>
          
          <motion.div
            className="relative h-full min-h-[300px]"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7 }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-turquoise to-lime opacity-10 blur-3xl rounded-full" />
            <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 h-full flex flex-col items-center justify-center">
              <p className="text-center font-bold text-white mb-4">Skill-Graph del Estudiante</p>
              <div className="w-full h-full bg-grid-pattern relative flex items-center justify-center rounded-lg">
                 <div className="w-full h-full flex items-center justify-center">
                    <p className="text-white/50 text-sm">Visualización del grafo de competencias</p>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};

export default MetricsSection;