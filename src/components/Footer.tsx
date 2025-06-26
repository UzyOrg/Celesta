import React from 'react';
import Link from 'next/link';
import { Twitter, Linkedin, Youtube, Instagram, Lightbulb } from 'lucide-react';
import Container from './Container';
import styles from './Footer.module.css';

const Footer: React.FC = () => {
  const footerSections = {
    product: [
      { name: 'Tutor Socrático IA', href: '#' },
      { name: 'Métricas de Aprendizaje', href: '#' },
      { name: 'Copiloto IA Docente', href: '#' },
      { name: 'Integraciones Flexibles', href: '#' },
    ],
    resources: [
      { name: 'Documentation', href: '#' },
      { name: 'Case Studies', href: '#' },
      { name: 'Blog', href: '#' },
      { name: 'Webinars', href: '#' },
      { name: 'API', href: '#' },
    ],
    company: [
      { name: 'About', href: '#' },
      { name: 'Team', href: '#' },
      { name: 'Careers', href: '#' },
      { name: 'Press', href: '#' },
      { name: 'Contact', href: '#' },
    ],
    legal: [
      { name: 'Terms', href: '#' },
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Cookies', href: '#' },
      { name: 'Licenses', href: '#' },
      { name: 'Settings', href: '#' },
    ],
  };

  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.grid}>
          <div className={styles.logoContainer}>
            <div className={styles.logoWrapper}>
              <Lightbulb className={styles.logoIcon} />
              <span className={styles.logoText}>
                Celestea<span className={styles.logoSubText}>AI</span>
              </span>
            </div>
            <p className={styles.description}>
              Potenciamos la educación con IA que enseña, mide y fortalece el rol fundamental del educador.
            </p>
            <div className={styles.socials}>
              <a href="#" className={styles.socialLink} aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className={styles.socialLink} aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
              <a href="#" className={styles.socialLink} aria-label="YouTube">
                <Youtube size={20} />
              </a>
              <a href="#" className={styles.socialLink} aria-label="Instagram">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {Object.entries(footerSections).map(([key, links]) => (
            <div key={key} className={styles.linksColumn}>
              <h3 className={styles.linksTitle}>{key.charAt(0).toUpperCase() + key.slice(1)}</h3>
              <ul className={styles.linksList}>
                {links.map((link) => (
                  <li key={link.name} className={styles.linkItem}>
                    <Link href={link.href}>{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.copyrightWrapper}>
          <p className={styles.copyrightText}>
            &copy; {new Date().getFullYear()} Celestea AI. Todos los derechos reservados.
          </p>
          <div className={styles.bottomLinks}>
            <div className={styles.bottomLink}>
              <a href="#">Terms</a>
            </div>
            <div className={styles.bottomLink}>
              <a href="#">Privacy</a>
            </div>
            <div className={styles.bottomLink}>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;