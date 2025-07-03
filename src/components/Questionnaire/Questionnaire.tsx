'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import styles from './Questionnaire.module.css';

// Define the structure for our form data
interface FormData {
  rol: string;
  contexto: string;
  desafio: string;
  herramientas: string[];
  exito: string;
  email: string;
}

// --- Constants for options ---
const ROLES = [
  "Docente de Primaria", "Docente de Secundaria",
  "Docente de Preparatoria / Bachillerato", "Director / Coordinador",
  "Profesor Universitario", "Otro"
];

const INSTITUTIONS = [
  "Escuela pública urbana", "Escuela pública rural",
  "Escuela privada",
  "Soy independiente / Tutor"
];

const CHALLENGES = [
  "Falta de tiempo para planificar creativamente",
  "Alinearme a la Nueva Escuela Mexicana (NEM)",
  "Implementar proyectos (ABP) es complejo",
  "Encontrar recursos de calidad",
  "Motivar a mis estudiantes"
];

const TOOLS = [
  "Modelos conversacionales de IA (ChatGPT, Gemini, etc.)",
  "Buscadores como Google",
  "Plataformas educativas (Google Classroom, Teams, etc.)",
  "Herramientas de diseño (Canva, Genially, etc.)",
  "Comunidades y recursos en redes sociales (Pinterest, Grupos de Facebook)",
  "Principalmente libros de texto y materiales físicos de la SEP",
  "Aún no uso herramientas de IA, pero quiero aprender"
];

const TOTAL_STEPS = 6;

// --- Main Component ---
const Questionnaire = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [customRole, setCustomRole] = useState('');
  const [formData, setFormData] = useState<FormData>({
    rol: '',
    contexto: '',
    desafio: '',
    herramientas: [],
    exito: '',
    email: ''
  });

  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, router]);

  const handleSingleSelect = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'rol' && value !== 'Otro') {
      setCustomRole(''); // Clear custom role if not "Otro"
    }
  };

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleMultiSelect = (value: string) => {
    setFormData(prev => {
      const currentTools = prev.herramientas;
      if (currentTools.includes(value)) {
        return { ...prev, herramientas: currentTools.filter(tool => tool !== value) };
      } else {
        return { ...prev, herramientas: [...currentTools, value] };
      }
    });
  };

  const handleTextChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('La respuesta de la red no fue correcta');
      }

      console.log("Datos del formulario enviados con éxito:", formData);
      setIsSubmitted(true);

    } catch (error) {
      console.error("Error al enviar el formulario:", error);
      alert("Hubo un error al enviar tu registro. Por favor, inténtalo de nuevo.");
    }
  };

  const progressWidth = (currentStep <= TOTAL_STEPS) ? (currentStep - 1) / TOTAL_STEPS * 100 : 100;

  return (
    <div className={styles.pageContainer}>
      {isSubmitted && (
        <div className={styles.successCard}>
          <h2>¡Registro Exitoso!</h2>
          <p>¡Ya estas en nuestra whitelist!</p>
        </div>
      )}
      <div className={styles.questionnaireContainer} style={{ filter: isSubmitted ? 'blur(4px)' : 'none', transition: 'filter 0.3s ease' }}>
        {/* Brand Header */}
        <div className={styles.brandHeader}>
          <div className={styles.brandContainer}>
            <Image src="/Logo_Clestea.png" alt="Celestea Logo" width={40} height={40} className={styles.brandIcon} />
            <h1 className={styles.brandName}>Celestea</h1>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className={styles.progressBarContainer}>
          <div 
            className={styles.progressBarFill} 
            style={{ width: `${progressWidth}%` }}
          />
        </div>
        
        <form onSubmit={handleSubmit}>
          {currentStep === 1 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>¿Cuál de estas opciones describe mejor tu rol actual?</h2>
              <div className={styles.optionsGrid}>
                {ROLES.map(role => (
                  <button key={role} type="button" className={`${styles.optionButton} ${formData.rol === role ? styles.selected : ''}`}
                    onClick={() => handleSingleSelect('rol', role)}>
                    {role}
                  </button>
                ))}
              </div>
              {formData.rol === 'Otro' && (
                <div className={styles.customInputContainer}>
                  <input
                    type="text"
                    className={styles.customInput}
                    placeholder="Especifica tu rol..."
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                  />
                </div>
              )}
              <div className={styles.navigationButtons}>
                <button 
                  type="button" 
                  className={styles.confirmButton} 
                  onClick={nextStep} 
                  disabled={!formData.rol || (formData.rol === 'Otro' && !customRole.trim())} 
                  style={{width: '100%'}}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>¿En qué tipo de institución trabajas principalmente?</h2>
              <div className={styles.optionsGrid}>
                {INSTITUTIONS.map(inst => (
                  <button key={inst} type="button" className={`${styles.optionButton} ${formData.contexto === inst ? styles.selected : ''}`}
                    onClick={() => handleSingleSelect('contexto', inst)}>
                    {inst}
                  </button>
                ))}
              </div>
              <div className={styles.navigationButtons}>
                <button type="button" className={styles.backButton} onClick={prevStep}>
                  Atrás
                </button>
                <button type="button" className={styles.confirmButton} onClick={nextStep} disabled={!formData.contexto}>
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>De estas opciones, ¿cuál es tu mayor desafío en tu labor docente hoy?</h2>
              <div className={styles.optionsGrid}>
                {CHALLENGES.map(challenge => (
                  <button key={challenge} type="button" className={`${styles.optionButton} ${formData.desafio === challenge ? styles.selected : ''}`}
                    onClick={() => handleSingleSelect('desafio', challenge)}>
                    {challenge}
                  </button>
                ))}
              </div>
              <div className={styles.navigationButtons}>
                <button type="button" className={styles.backButton} onClick={prevStep}>
                  Atrás
                </button>
                <button type="button" className={styles.confirmButton} onClick={nextStep} disabled={!formData.desafio}>
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>¿Qué tipo de herramientas digitales usas actualmente en tu planificación?</h2>
              <div className={styles.optionsGrid}>
                {TOOLS.map(tool => (
                  <button key={tool} type="button" className={`${styles.optionButton} ${formData.herramientas.includes(tool) ? styles.selected : ''}`}
                    onClick={() => handleMultiSelect(tool)}>
                    {tool}
                  </button>
                ))}
              </div>
              <div className={styles.navigationButtons}>
                <button type="button" className={styles.backButton} onClick={prevStep}>
                  Atrás
                </button>
                <button type="button" className={styles.confirmButton} onClick={nextStep} disabled={formData.herramientas.length === 0}>
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>Imagina que tienes un copiloto de IA perfecto. <br/><br/> Describe en una frase qué le pedirías que hiciera para que tu vida como docente fuera drásticamente mejor.</h2>
              <textarea
                className={styles.textArea}
                placeholder="Ej: Que me ayude a crear proyectos interdisciplinarios basados en los intereses de mis alumnos."
                value={formData.exito}
                onChange={(e) => handleTextChange('exito', e.target.value)}
              />
              <div className={styles.navigationButtons}>
                <button type="button" className={styles.backButton} onClick={prevStep}>
                  Atrás
                </button>
                <button type="button" className={styles.confirmButton} onClick={nextStep} disabled={!formData.exito.trim()}>
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>¡Gracias! Tu visión es exactamente lo que estamos construyendo. Déjanos tu correo para ser considerado/a para nuestro programa piloto.</h2>
              <input
                type="email"
                className={styles.emailInput}
                placeholder="tu.correo@ejemplo.com"
                value={formData.email}
                onChange={(e) => handleTextChange('email', e.target.value)}
                required
              />
              <div className={styles.navigationButtons}>
                <button type="button" className={styles.backButton} onClick={prevStep}>
                  Atrás
                </button>
                <button type="submit" className={styles.finalSubmitButton} disabled={!formData.email.includes('@')}>
                  Enviar y Unirme a la Whitelist
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Questionnaire;
