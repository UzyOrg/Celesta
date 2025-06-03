import { MotionProps } from 'framer-motion';

// Fade up animation preset
export const fadeUpAnimation = (delay: number = 0): MotionProps => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { 
    duration: 0.5, 
    delay: delay * 0.12  // Staggered delay based on the parameter
  },
  viewport: { once: true }
});

// Subtle scale animation
export const subtleScaleAnimation = (delay: number = 0): MotionProps => ({
  initial: { opacity: 0, scale: 0.95 },
  whileInView: { opacity: 1, scale: 1 },
  transition: { 
    duration: 0.5, 
    delay: delay * 0.12  
  },
  viewport: { once: true }
});

// Hero parallax animation
export const parallaxAnimation = {
  y: [-20, 20],
  transition: {
    repeat: Infinity,
    repeatType: "reverse" as const,
    duration: 20,
    ease: "linear"
  }
};