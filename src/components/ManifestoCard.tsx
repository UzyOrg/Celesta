import React from 'react';
import { motion } from 'framer-motion';
import styles from './Manifiesto.module.css';

interface ManifestoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const ManifestoCard: React.FC<ManifestoCardProps> = ({ icon, title, description }) => {
  return (
    <motion.div className={styles.card} variants={itemVariants}>
      <div className={styles.iconWrapper}>{icon}</div>
      <h4 className={styles.cardTitle}>{title}</h4>
      <p className={styles.cardDescription}>{description}</p>
    </motion.div>
  );
};

export default ManifestoCard;
