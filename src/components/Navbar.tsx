import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Container from './Container';
import Button from './Button';
import styles from './Navbar.module.css';

const navLinks = [
  { name: 'Producto', href: '#product' },
  { name: 'Soluciones', href: '#solutions' },
  { name: 'Planes', href: '#pricing' },
  { name: 'Recursos', href: '#resources' },
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
          {/* Logo */}
          <Link href="/" className={styles.logoContainer} onClick={closeMenu}>
            <Sparkles className={styles.logoIcon} />
            <span className={styles.logoText}>Celesta</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className={styles.desktopNav}>
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className={styles.navLink}>
                {link.name}
              </a>
            ))}
            <button
              onClick={toggleTheme}
              className={styles.iconButton}
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? (
                <Sun className={styles.icon} />
              ) : (
                <Moon className={styles.icon} />
              )}
            </button>
            <Button variant="secondary">
              <Sparkles className="w-4 h-4 mr-2" />
              Solicita Demo
            </Button>
          </nav>

          {/* Mobile Menu Toggle */}
          <div className={styles.mobileToggleContainer}>
            <button
              onClick={toggleTheme}
              className={styles.iconButton}
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <Sun className={styles.icon} /> : <Moon className={styles.icon} />}
            </button>
            <button
              className={styles.mobileMenuToggle}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </Container>
      
      {/* Mobile Menu Panel */}
      {isMenuOpen && (
        <div className={styles.mobileMenuPanel}>
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} className={styles.navLink} onClick={closeMenu}>
              {link.name}
            </a>
          ))}
          <Button variant="secondary" className="w-full mt-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Solicita Demo
          </Button>
        </div>
      )}
    </header>
  );
};

export default Navbar;