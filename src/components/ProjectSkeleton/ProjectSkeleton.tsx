import React from 'react';
import styles from './ProjectSkeleton.module.css';

const ProjectSkeleton: React.FC = () => {
  return (
    <div className={styles.skeletonWrapper}>
      <div className={styles.skeletonTitle}></div>
      <div className={styles.skeletonGrid}>
        <div className={styles.skeletonCard}></div>
        <div className={styles.skeletonCard}></div>
        <div className={styles.skeletonCard}></div>
        <div className={styles.skeletonCard}></div>
        <div className={`${styles.skeletonCard} ${styles.skeletonCardLarge}`}></div>
        <div className={styles.skeletonCard}></div>
      </div>
    </div>
  );
};

export default ProjectSkeleton;
