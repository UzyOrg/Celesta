'use client';

import { useState, useEffect } from 'react';
import styles from './TallerDeProyectos.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Box, FlaskConical, BookOpen, ChevronDown, Lightbulb, CheckCircle, Clock } from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface Task {
  id: number;
  title: string;
  type: 'lab' | 'research';
  status: 'completed' | 'pending';
}

interface ProjectPhase {
  id: number;
  titulo_fase: string;
  tareas: Task[];
}

interface ProjectData {
  titulo_proyecto: string;
  pregunta_esencial: string;
  producto_final: {
    nombre: string;
    icon: 'video' | 'box';
  }[];
  fases_del_proyecto: ProjectPhase[];
  pregunta_al_docente: string;
}

// --- MOCK DATA ---
const mockProjectData: ProjectData = {
  titulo_proyecto: "Ciudad Célula: Un Viaje al Interior",
  pregunta_esencial: "¿Cómo funciona una célula como si fuera una ciudad bulliciosa y qué la mantiene viva?",
  producto_final: [
    { nombre: "Video-Reportaje", icon: 'video' },
    { nombre: "Maqueta 3D Interactiva", icon: 'box' }
  ],
  fases_del_proyecto: [
    {
      id: 1,
      titulo_fase: "Fase 1: La Arquitectura Celular",
      tareas: [
        { id: 101, title: "Laboratorio: Identificando Organelos", type: 'lab', status: 'completed' },
        { id: 102, title: "Investigación: La Membrana Plasmática", type: 'research', status: 'pending' },
      ]
    },
    {
      id: 2,
      titulo_fase: "Fase 2: La Energía de la Vida",
      tareas: [
        { id: 201, title: "Laboratorio: Simulación de la Respiración Celular", type: 'lab', status: 'pending' },
      ]
    },
    {
      id: 3,
      titulo_fase: "Fase 3: Comunicación y Transporte",
      tareas: [
        { id: 301, title: "Investigación: ¿Cómo se comunican las células?", type: 'research', status: 'pending' },
        { id: 302, title: "Laboratorio: Ósmosis en acción", type: 'lab', status: 'pending' },
      ]
    }
  ],
  pregunta_al_docente: "Piensa en una ciudad. Si el núcleo es el ayuntamiento, ¿qué organelo sería la planta de energía y por qué?"
};

// --- ICON MAPPING ---
const ICONS = {
  video: <Video className={styles.productIcon} />,
  box: <Box className={styles.productIcon} />,
  lab: <FlaskConical size={20} className={styles.taskIcon} />,
  research: <BookOpen size={20} className={styles.taskIcon} />,
};

// --- SKELETON COMPONENTS ---
const Skeleton = ({ className }: { className?: string }) => <div className={`${styles.skeleton} ${className}`}></div>;

const StudentWorkshopSkeleton = () => (
  <div className={styles.mainContent}>
    <div className={styles.headerContainer}>
      <Skeleton className="h-10 w-3/4 mb-4" />
      <Skeleton className="h-16 w-full" />
    </div>
    <Skeleton className={`${styles.productCard} h-20`} />
    <div className={styles.accordionContainer}>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
    <Skeleton className={`${styles.teacherPrompt} h-24 mt-8`} />
  </div>
);


// --- MAIN COMPONENT ---
const StudentWorkshopPage = () => {
  const [activePhase, setActivePhase] = useState<number | null>(1);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setProjectData(mockProjectData);
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const togglePhase = (phaseId: number) => {
    setActivePhase(activePhase === phaseId ? null : phaseId);
  };

  return (
    <div className={styles.pageContainer}>
      {isLoading ? (
        <StudentWorkshopSkeleton />
      ) : (
        projectData && (
          <motion.div
            className={styles.mainContent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Component 1: ProjectHeader */}
            <header className={styles.headerContainer}>
              <h1>{projectData.titulo_proyecto}</h1>
              <p>{projectData.pregunta_esencial}</p>
            </header>

            {/* Component 2: FinalProductCard */}
            <div className={styles.productCard}>
              {projectData.producto_final[0].icon && ICONS[projectData.producto_final[0].icon]}
              <span>Producto Final: <strong>{projectData.producto_final.map(p => p.nombre).join(' y ')}</strong></span>
            </div>

            {/* Component 3: ProjectPhasesAccordion */}
            <div className={styles.accordionContainer}>
              {projectData.fases_del_proyecto.map((phase) => (
                <div key={phase.id}>
                  <button
                    className={`${styles.phaseButton} ${activePhase === phase.id ? styles.activePhase : ''}`}
                    onClick={() => togglePhase(phase.id)}
                  >
                    <span>{phase.titulo_fase}</span>
                    <motion.div animate={{ rotate: activePhase === phase.id ? 180 : 0 }}>
                      <ChevronDown size={20} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {activePhase === phase.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={styles.phaseContent}
                      >
                        <div className="flex flex-col gap-3">
                          {phase.tareas.map(task => (
                            <div key={task.id} className={styles.taskCard}>
                              <div className={styles.taskInfo}>
                                {ICONS[task.type]}
                                <span className={styles.taskTitle}>{task.title}</span>
                              </div>
                              <span className={`${styles.taskStatus} ${task.status === 'completed' ? styles.statusCompleted : styles.statusPending}`}>
                                {task.status === 'completed' ? <CheckCircle size={16} /> : <Clock size={16} />}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Component 4: TeacherNoteCard */}
            <div className={styles.teacherPrompt}>
              <Lightbulb className={styles.teacherPromptIcon} />
              <p>{projectData.pregunta_al_docente}</p>
            </div>
          </motion.div>
        )
      )}
    </div>
  );
};

export default StudentWorkshopPage;

