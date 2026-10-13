import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Boton.module.css';

export type VarianteBoton = 'primario' | 'contorno' | 'suave' | 'tarjeta' | 'sutil';

/** Cada superficie tiene sus propias escalas de altura, tamaño de letra y relleno. */
export type EntornoBoton = 'alumno' | 'profesor';

/** Altura en px. Alumno: 64, 56, 52 y 44. Profesor: 52, 48, 44 y 40. */
export type AlturaBoton = 64 | 56 | 52 | 48 | 44 | 40;

interface BotonBaseProps {
  variante?: VarianteBoton;
  entorno?: EntornoBoton;
  tamano?: AlturaBoton;
  /** "completo" ocupa todo el ancho disponible (lo normal en el móvil del alumno). */
  ancho?: 'auto' | 'completo';
  /** Icono de lucide-react (decorativo; el texto siempre acompaña). */
  icono?: ReactNode;
  iconoAlFinal?: boolean;
  className?: string;
  children: ReactNode;
}

export interface BotonComoBotonProps
  extends BotonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BotonBaseProps> {
  href?: undefined;
}

export interface BotonComoEnlaceProps
  extends BotonBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BotonBaseProps | 'href'> {
  href: string;
}

export type BotonProps = BotonComoBotonProps | BotonComoEnlaceProps;

const ALTURA_POR_DEFECTO: Readonly<Record<EntornoBoton, AlturaBoton>> = {
  alumno: 64,
  profesor: 44,
};

function esRutaInterna(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * Botón de la superficie de defensas.
 *
 * Renderiza `<button>` o, si recibe `href`, un enlace (con `next/link` para
 * rutas internas). Los dos comparten exactamente el mismo aspecto, de modo que
 * "algo que navega" y "algo que hace" se ven iguales y se distinguen por su rol.
 */
export function Boton(props: BotonProps) {
  const {
    variante = 'primario',
    entorno = 'alumno',
    tamano = ALTURA_POR_DEFECTO[entorno],
    ancho,
    icono,
    iconoAlFinal = false,
    className,
    children,
  } = props;

  const anchoFinal = ancho ?? (entorno === 'alumno' ? 'completo' : 'auto');
  const clases = [
    styles.boton,
    styles[`entorno-${entorno}`] ?? '',
    styles[`variante-${variante}`] ?? '',
    styles[`alto-${tamano}`] ?? '',
    anchoFinal === 'completo' ? styles.completo : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

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
      entorno: _entorno,
      tamano: _tamano,
      ancho: _ancho,
      icono: _icono,
      iconoAlFinal: _iconoAlFinal,
      className: _className,
      children: _children,
      href,
      target,
      rel,
      ...restoEnlace
    } = props;
    const relFinal = target === '_blank' ? (rel ?? 'noopener noreferrer') : rel;

    if (esRutaInterna(href) && target !== '_blank') {
      return (
        <Link href={href} className={clases} rel={relFinal} {...restoEnlace}>
          {contenido}
        </Link>
      );
    }
    return (
      <a href={href} target={target} rel={relFinal} className={clases} {...restoEnlace}>
        {contenido}
      </a>
    );
  }

  const {
    variante: _variante,
    entorno: _entorno,
    tamano: _tamano,
    ancho: _ancho,
    icono: _icono,
    iconoAlFinal: _iconoAlFinal,
    className: _className,
    children: _children,
    href: _href,
    type = 'button',
    ...restoBoton
  } = props;

  return (
    <button type={type} className={clases} {...restoBoton}>
      {contenido}
    </button>
  );
}
