import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Sun, Moon, Sparkles, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import Container from './Container';
import Button from './Button';
import BetaRequestModal from './BetaRequestModal';
import styles from './Navbar.module.css';

const navLinks = [
  { name: 'Producto', href: '/#product' },
  { name: 'Soluciones', href: '/#solutions' },
  { name: 'El Problema', href: '/#El-problema' },
  { name: 'Contacto', href: '/#cta' },
];

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);
  
  const openBetaModal = () => {
    setIsBetaModalOpen(true);
    closeMenu();
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''}`}>
      <Container>
        <div className={styles.navContainer}>
          <div className={styles.navLeft}>
            <button
              className={styles.mobileMenuToggle}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
            <Link href="/" className={styles.logoContainer} onClick={closeMenu}>
              <Image src="/Logo_Celestea.png" alt="Celestea Logo" width={32} height={32} />
              <span className={styles.logoText}>Celestea</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className={styles.desktopNav}>
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} className={styles.navLink}>
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Beta Access CTA - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={openBetaModal}
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-crystal-blue to-crystal-lavender text-black rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Contáctanos
            </button>
          </div>

          {/* Mobile Actions */}
          <div className={styles.mobileActions}>
            <button
              onClick={openBetaModal}
              className={styles.mobileDemoButton}
            >
              Contáctanos
            </button>
          </div>
        </div>
      </Container>
      
      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            className={styles.mobileMenuPanel}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} className={styles.navLink} onClick={closeMenu}>
                {link.name}
              </Link>
            ))}
            <div className="border-t border-neutral-800 my-2"></div>
            <button
              onClick={openBetaModal}
              className={`${styles.navLink} w-full text-left`}
            >
              <span className="text-crystal-blue font-semibold flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                Contáctanos
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Beta Request Modal */}
      <BetaRequestModal
        isOpen={isBetaModalOpen}
        onClose={() => setIsBetaModalOpen(false)}
      />
    </header>
  );
};

export default Navbar;