'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import Button from './Button';
import { useRouter } from 'next/navigation';
import styles from './CustomTopicModal.module.css';

interface CustomTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  customTopic: string;
}

const CustomTopicModal: React.FC<CustomTopicModalProps> = ({ 
  isOpen, 
  onClose, 
  customTopic 
}) => {
  const router = useRouter();

  const handleStartQuestionnaire = () => {
    onClose();
    router.push('/questionnaire');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>

            <div className={styles.header}>
              <div className={styles.iconWrapper}>
                <Sparkles className={styles.sparkleIcon} />
              </div>
              <h2 className={styles.title}>
                ¡Vemos que tienes un tema en mente!
              </h2>
            </div>

            <div className={styles.content}>
              <p className={styles.description}>
                ¡Regístrate para ser de los primeros y poder contactarte para buscar la mejor solución para ti!
              </p>
            </div>

            <div className={styles.actions}>
              <Button 
                size="lg" 
                onClick={handleStartQuestionnaire}
                className={styles.fullWidth}
              >
                Iniciar Aplicación
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={onClose}
                className={styles.fullWidth}
              >
                Tal vez después
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomTopicModal;