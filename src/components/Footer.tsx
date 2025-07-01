import React from 'react';
import Link from 'next/link';
import Container from './Container';
import styles from './Footer.module.css';

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.minimalFooter}>
          <p className={styles.copyrightText}>
            &copy; {new Date().getFullYear()} Celestea AI. Todos los derechos reservados.
          </p>
          <div className={styles.legalLinks}>
            <Link href="/terms" className={styles.legalLink}>
              Términos y Condiciones
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;