import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Sun, Moon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import Container from './Container';
import Button from './Button';
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
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

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
            <Link href="/questionnaire" className={styles.navLink}>
              <span className={styles.whitelistText}>Únete a la whitelist</span>
            </Link>
          </nav>

          {/* Auth Actions - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link 
              href="/signup" 
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-turquoise to-lime text-black rounded-lg hover:from-turquoise-600 hover:to-lime-600 transition-all"
            >
              Crear Cuenta
            </Link>
          </div>

          {/* Mobile Actions */}
          <div className={styles.mobileActions}>
            <Link href="/login" className="text-sm text-neutral-300 hover:text-white px-3 py-2">
              Login
            </Link>
            <Link href="/signup" className={styles.mobileDemoButton}>
              Registrarse
            </Link>
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
            <Link href="/login" className={styles.navLink} onClick={closeMenu}>
              Iniciar Sesión
            </Link>
            <Link href="/signup" className={styles.navLink} onClick={closeMenu}>
              <span className="text-lime font-semibold">Crear Cuenta</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;