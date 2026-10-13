import type { ReactNode } from 'react';
import { BarraLateral } from './BarraLateral';
import type { MenuLateral } from './derivados';
import type { Profesora } from './types';
import styles from './MarcoProfesor.module.css';

/**
 * Cómo se comporta el contenido junto al menú:
 * - "agente": una sola pantalla de alto fijo con su propio desplazamiento (inicio).
 * - "dividido": conversación a la izquierda y panel a la derecha (nueva actividad).
 * - "pagina": una página que crece y se desplaza con el menú fijo (reporte, enlace).
 * - "bloqueada": pantalla fija mientras un diálogo pide algo antes de seguir.
 */
export type FormaMarco = 'agente' | 'dividido' | 'pagina' | 'bloqueada';

interface MarcoProfesorProps {
  token: string;
  menu: MenuLateral;
  profesora: Profesora;
  forma: FormaMarco;
  /** Marca el contenido como decorativo (el fondo borroso detrás de un diálogo). */
  oculto?: boolean;
  /** Efecto del diseño detrás del diálogo: desenfoque y menos opacidad. */
  difuminado?: boolean;
  children: ReactNode;
}

/**
 * Marco común del profesor: menú lateral a la izquierda y contenido a la
 * derecha. Es un `flex-wrap`: cuando no caben los dos lado a lado (menos de
 * 808 px), el menú pasa arriba y el contenido debajo, sin desplazamiento
 * horizontal hasta 390 px.
 */
export function MarcoProfesor({
  token,
  menu,
  profesora,
  forma,
  oculto = false,
  difuminado = false,
  children,
}: MarcoProfesorProps) {
  const clasesMarco = forma === 'bloqueada' ? `${styles.marco} ${styles.bloqueado}` : styles.marco;
  const clasesPrincipal = [
    styles.principal,
    forma === 'agente' ? styles.agente : '',
    forma === 'dividido' ? styles.dividido : '',
    forma === 'pagina' ? styles.pagina : '',
    forma === 'bloqueada' ? styles.principalBloqueada : '',
    difuminado ? styles.difuminado : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={clasesMarco}>
      <BarraLateral token={token} menu={menu} profesora={profesora} fija={forma === 'pagina'} decorativa={oculto} />
      <main id="contenido-revision" className={clasesPrincipal} aria-hidden={oculto ? true : undefined}>
        {children}
      </main>
    </div>
  );
}
