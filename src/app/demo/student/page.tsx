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

// --- SUB-COMPONENTS --- 

const ProjectHeader = ({ title, question }: { title: string, question: string }) => (
  <header className={`${styles.glassCard} ${styles.headerContainer}`}>
    <h1>{title}</h1>
    <p>{question}</p>
  </header>
);

const FinalProductCard = ({ products }: { products: { nombre: string, icon: 'video' | 'box' }[] }) => (
  <div className={`${styles.glassCard} ${styles.productCard}`}>
    {products[0].icon && ICONS[products[0].icon]}
    <span>Producto Final: <strong>{products.map(p => p.nombre).join(' y ')}</strong></span>
  </div>
);

const NotesPanel = () => (
  <div className={`${styles.glassCard} ${styles.notesPanel}`}>
    <h3>Mis Apuntes</h3>
    <textarea placeholder="Escribe tus ideas, notas y enlaces aquí..."></textarea>
  </div>
);

const TeacherNoteCard = ({ prompt }: { prompt: string }) => (
  <div className={`${styles.glassCard} ${styles.teacherPrompt}`}>
    <Lightbulb className={styles.teacherPromptIcon} />
    <p>{prompt}</p>
  </div>
);

const ProjectPhasesAccordion = ({ phases, activePhase, onTogglePhase }: { phases: ProjectPhase[], activePhase: number | null, onTogglePhase: (id: number) => void }) => (
  <div className={styles.accordionContainer}>
    {phases.map((phase) => (
      <motion.div
        layout
        key={phase.id}
        className={`${styles.phaseItem} ${activePhase === phase.id ? styles.activePhase : ''}`}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <button
          className={`${styles.phaseButton} ${activePhase === phase.id ? styles.activePhase : ''}`}
          onClick={() => onTogglePhase(phase.id)}
        >
          <span>{phase.titulo_fase}</span>
          <motion.div animate={{ rotate: activePhase === phase.id ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown size={20} />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {activePhase === phase.id && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={styles.phaseContent}
            >
              <div className={styles.phaseContentInner}>
                <div className={styles.taskList}>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    ))}
  </div>
);

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
            className={styles.dashboardLayout}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <main className={styles.mainColumn}>
              <ProjectPhasesAccordion 
                phases={projectData.fases_del_proyecto}
                activePhase={activePhase}
                onTogglePhase={togglePhase}
              />
            </main>
            <aside className={styles.sidebarColumn}>
              <ProjectHeader 
                title={projectData.titulo_proyecto} 
                question={projectData.pregunta_esencial} 
              />
              <FinalProductCard products={projectData.producto_final} />
              <NotesPanel />
              <TeacherNoteCard prompt={projectData.pregunta_al_docente} />
            </aside>
          </motion.div>
        )
      )}
    </div>
  );
};

export default StudentWorkshopPage;

