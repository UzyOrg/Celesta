'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './DemoTeacherPage.module.css';
import Button from '@/components/Button';
import Container from '@/components/Container';
import Link from 'next/link';
import { Lightbulb } from 'lucide-react';
import DownloadPDFButton from '@/components/DownloadPDFButton';

// --- TYPES ---
interface ProjectPhase {
  fase: number;
  titulo_fase: string;
  descripcion: string;
}

interface ProjectLevel {
  nivel_escolar: string;
  titulo_adaptado: string;
  pregunta_esencial_adaptada: string;
  producto_final_adaptado: string;
  objetivos_adaptados: string[];
  fases_adaptadas: ProjectPhase[];
  metodo_evaluacion_adaptado: string;
  pregunta_al_docente_adaptada: string;
}

interface MultiLevelProject {
  id_proyecto: string;
  tema_general: string;
  pregunta_esencial_base: string;
  niveles: ProjectLevel[];
}

const DemoTeacherPage: React.FC = () => {
  const [project, setProject] = useState<MultiLevelProject | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<ProjectLevel | null>(null);
  const [loading, setLoading] = useState(false);
  const [materia, setMateria] = useState('machine_learning');
  const [grado, setGrado] = useState('Primaria');
  const [specificTopic, setSpecificTopic] = useState('');

  useEffect(() => {
    if (!project) {
      setSelectedLevel(null);
      return;
    }

    const levelData = project.niveles.find(
      (nivel) => nivel.nivel_escolar.toLowerCase() === grado.toLowerCase()
    );
    setSelectedLevel(levelData || null);
  }, [project, grado]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setProject(null);

    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const response = await fetch(`/demo-projects/${materia.toLowerCase()}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const projectData = await response.json();
      setProject(projectData as MultiLevelProject);
    } catch (error) {
      console.error(`Error loading project data for ${materia}:`, error);
      setProject(null); // Clear project on error
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className={styles.pageWrapper}>
      <div className={styles.glowWrapper}>
        <div className={styles.glowTop}></div>
        <div className={styles.glowBottom}></div>
      </div>

      <Container className="z-10">
        {loading && <div className="text-center py-10">Cargando...</div>}

        {!loading && !selectedLevel && (
          <>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Copiloto Docente</h1>
              <p className={styles.pageSubtitle}>
                Diseña proyectos de aprendizaje basados en desafíos que tus alumnos amarán. Transforma tu aula con pedagogías activas y recupera tiempo valioso.
              </p>
            </div>
            <motion.form 
              onSubmit={handleSubmit} 
              className={styles.formContainer}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="materia" className={styles.formLabel}>Materia</label>
                  <select id="materia" value={materia} onChange={e => setMateria(e.target.value)} className={`${styles.formInput} ${styles.formSelect}`}>
                    <option value="machine_learning">Machine Learning</option>
                    <option value="historia">Historia</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="grado" className={styles.formLabel}>Grado Escolar</label>
                  <select id="grado" value={grado} onChange={e => setGrado(e.target.value)} className={`${styles.formInput} ${styles.formSelect}`}>
                    <option>Primaria</option>
                    <option>Secundaria</option>
                    <option>Preparatoria</option>
                    <option>Universidad</option>
                  </select>
                </div>

                <div className={styles.dividerContainer}>
                  <span className={styles.dividerLine}></span>
                  <span className={styles.dividerText}>ó</span>
                  <span className={styles.dividerLine}></span>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="specificTopic" className={styles.formLabel}>Tema específico (opcional)</label>
                  <input
                    type="text"
                    id="specificTopic"
                    value={specificTopic}
                    onChange={(e) => setSpecificTopic(e.target.value)}
                    className={styles.formInput}
                    placeholder="Ej: La fotosíntesis en plantas acuáticas"
                  />
                </div>
              </div>

              <div className={styles.formAction}>
                <Button size="lg" type="submit" disabled={!materia || !grado || loading}>
                  {loading ? 'Generando...' : 'Diseñar Proyecto'}
                </Button>
              </div>
            </motion.form>
          </>
        )}

        {!loading && selectedLevel && (
          <div className={styles.resultsContainer}>
            <div className={styles.planTitleContainer}>
              <h2 className={styles.planTitle}>
                {selectedLevel.titulo_adaptado}
              </h2>
            </div>

            <motion.div 
              className={styles.resultsGrid}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
            >
              {/* Essential Question Card */}
              <motion.div className={`${styles.gridCard} ${styles.essentialQuestionCard}`}>
                <h3 className={styles.sectionTitle}>Pregunta Esencial</h3>
                <blockquote className={styles.essentialQuestion}>
                  {selectedLevel.pregunta_esencial_adaptada}
                </blockquote>
              </motion.div>

              {/* Learning Objectives Card */}
              <motion.div className={`${styles.gridCard} ${styles.objectivesCard}`}>
                <h3 className={styles.sectionTitle}>Objetivos de Aprendizaje</h3>
                <ul className={styles.learningObjectivesList}>
                  {selectedLevel.objetivos_adaptados.map((obj, index) => (
                    <li key={index}>{obj}</li>
                  ))}
                </ul>
              </motion.div>

              {/* Final Product Card */}
              <motion.div className={styles.gridCard}>
                <h3 className={styles.sectionTitle}>Producto Final a Crear</h3>
                <p className={styles.finalProductText}>
                  {selectedLevel.producto_final_adaptado}
                </p>
              </motion.div>

              {/* Evaluation Card */}
              <motion.div className={styles.gridCard}>
                <h3 className={styles.sectionTitle}>Evaluación</h3>
                <div>
                  <p className={styles.evaluationText}>
                    {selectedLevel.metodo_evaluacion_adaptado}
                  </p>
                  <div className={styles.evaluationNoteContainer}>
                    <Lightbulb className={styles.evaluationNoteIcon} />
                    <p className={styles.evaluationNote}>
                      Pst, nuestro copiloto también puede ayudarte a generar la rúbrica perfecta para este proyecto.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Phases Card */}
              <motion.div className={`${styles.gridCard} ${styles.phasesCard}`}>
                <h3 className={styles.sectionTitle}>Fases del Proyecto</h3>
                <div className={styles.phasesContainer}>
                  {selectedLevel.fases_adaptadas.map((fase, index) => (
                    <details key={index} className={styles.phaseDetails}>
                      <summary className={styles.phaseSummary}>
                        <span>Fase {fase.fase}: {fase.titulo_fase}</span>
                      </summary>
                      <div className={styles.phaseContent}>
                        <p>{fase.descripcion}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </motion.div>

              {/* Teacher Corner Card */}
              <motion.div className={`${styles.gridCard} ${styles.teacherCornerCard}`}>
                <h3 className={styles.sectionTitle}>Teacher Corner</h3>
                <p className={styles.teacherQuestionText}>
                  {selectedLevel.pregunta_al_docente_adaptada}
                </p>
              </motion.div>
            </motion.div>

            <div className={styles.summaryButtonContainer}>
              <DownloadPDFButton projectData={selectedLevel} />
              <Link href="/demo/summary?from=teacher" className={styles.summaryButton}>
                Ver mi Impacto →
              </Link>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};

export default DemoTeacherPage;
