import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { bricolage, dmMono } from '@/components/celeste/fuentes';
import tema from '@/components/celeste/tokens.module.css';

/**
 * Prototipo de las defensas orales (lado del alumno): datos de ejemplo, sin
 * servidor. Se marca como no indexable mientras no exista contenido real.
 */
export const metadata: Metadata = {
  title: 'Celestea',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#070B16',
  colorScheme: 'dark',
};

interface LayoutDefensaProps {
  children: ReactNode;
}

/**
 * Carga las fuentes locales (variables CSS) y envuelve la ruta en el contenedor
 * temático Celeste. No toca el layout raíz ni globals.css.
 */
export default function LayoutDefensa({ children }: LayoutDefensaProps) {
  return (
    <div className={`${tema.tema} ${bricolage.variable} ${dmMono.variable}`} data-celeste="">
      {children}
    </div>
  );
}
