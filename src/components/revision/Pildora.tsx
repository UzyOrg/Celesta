import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { variablesCss } from '../celeste/variablesCss';
import styles from './Pildora.module.css';

export type VariantePildora = 'primaria' | 'contorno' | 'suave';

interface PildoraBaseProps {
  variante?: VariantePildora;
  /** Altura en px del botón completo. */
  alto?: 40 | 44 | 48 | 52;
  /** Relleno horizontal en px. */
  relleno?: number;
  /** Tamaño de letra en px. */
  letra?: number;
  /** Grosor de la letra. */
  peso?: 500 | 600 | 650;
  /** Separación entre icono y texto, en px. */
  espacio?: number;
  ancho?: 'auto' | 'completo';
  /** Ancho mínimo en px (el botón "Copiar" del enlace). */
  anchoMinimo?: number;
  /** Icono de lucide-react (decorativo; el texto siempre acompaña). */
  icono?: ReactNode;
  iconoAlFinal?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface PildoraComoBotonProps
  extends PildoraBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof PildoraBaseProps> {
  href?: undefined;
}

export interface PildoraComoEnlaceProps
  extends PildoraBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof PildoraBaseProps | 'href'> {
  href: string;
}

export type PildoraProps = PildoraComoBotonProps | PildoraComoEnlaceProps;

function esRutaInterna(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * Botón en forma de pastilla del lado del profesor.
 *
 * Los botones de los diseños del profesor varían de un lugar a otro en unos
 * pocos píxeles de relleno y de grosor, así que cada uso declara su medida
 * (alto, relleno, letra) y el aspecto común (colores, hover, foco, transición)
 * vive en un solo lugar. Renderiza `<button>` o, si recibe `href`, un enlace
 * (con `next/link` para rutas internas).
 */
export function Pildora(props: PildoraProps) {
  const {
    variante = 'primaria',
    alto = 44,
    relleno = 18,
    letra = 15,
    peso = variante === 'primaria' ? 650 : 600,
    espacio = 8,
    ancho = 'auto',
    anchoMinimo,
    icono,
    iconoAlFinal = false,
    className,
    style,
    children,
  } = props;

  const clases = [
    styles.pildora,
    styles[`variante-${variante}`] ?? '',
    ancho === 'completo' ? styles.completo : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const medidas = variablesCss(
    {
      '--alto': `${alto}px`,
      '--relleno': `${relleno}px`,
      '--letra': `${letra}px`,
      '--peso': peso,
      '--espacio': `${espacio}px`,
      '--ancho-minimo': anchoMinimo === undefined ? undefined : `${anchoMinimo}px`,
    },
    style,
  );

  const contenido = (
    <>
      {icono && !iconoAlFinal ? <span className={styles.icono}>{icono}</span> : null}
      <span className={styles.texto}>{children}</span>
      {icono && iconoAlFinal ? <span className={styles.icono}>{icono}</span> : null}
    </>
  );

  if (props.href !== undefined) {
    const {
      variante: _variante,
      alto: _alto,
      relleno: _relleno,
      letra: _letra,
      peso: _peso,
      espacio: _espacio,
      ancho: _ancho,
      anchoMinimo: _anchoMinimo,
      icono: _icono,
      iconoAlFinal: _iconoAlFinal,
      className: _className,
      style: _style,
      children: _children,
      href,
      target,
      rel,
      ...restoEnlace
    } = props;
    const relFinal = target === '_blank' ? (rel ?? 'noopener noreferrer') : rel;

    if (esRutaInterna(href) && target !== '_blank') {
      return (
        <Link href={href} className={clases} style={medidas} rel={relFinal} {...restoEnlace}>
          {contenido}
        </Link>
      );
    }
    return (
      <a href={href} target={target} rel={relFinal} className={clases} style={medidas} {...restoEnlace}>
        {contenido}
      </a>
    );
  }

  const {
    variante: _variante,
    alto: _alto,
    relleno: _relleno,
    letra: _letra,
    peso: _peso,
    espacio: _espacio,
    ancho: _ancho,
    anchoMinimo: _anchoMinimo,
    icono: _icono,
    iconoAlFinal: _iconoAlFinal,
    className: _className,
    style: _style,
    children: _children,
    href: _href,
    type = 'button',
    ...restoBoton
  } = props;

  return (
    <button type={type} className={clases} style={medidas} {...restoBoton}>
      {contenido}
    </button>
  );
}
