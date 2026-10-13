'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as EventoTeclado, MouseEvent as EventoRaton, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import styles from './Dialogo.module.css';

interface DialogoProps {
  abierto: boolean;
  /** Se llama con Escape y al tocar el fondo (si `cerrarConFondo`). */
  alCerrar: () => void;
  /** `id` del título dentro del contenido: es el nombre accesible del diálogo. */
  etiquetadoPor: string;
  /** `id` del texto que describe el diálogo, si lo hay. */
  descritoPor?: string;
  /** "hoja" sube desde abajo (móvil del alumno); "centrado" flota al centro. */
  forma?: 'hoja' | 'centrado';
  cerrarConEscape?: boolean;
  cerrarConFondo?: boolean;
  /** Elemento que recibe el foco al abrir. Por omisión, el primer control. */
  enfoqueInicial?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function enfocablesDe(contenedor: HTMLElement): HTMLElement[] {
  return Array.from(contenedor.querySelectorAll<HTMLElement>(ENFOCABLES)).filter(
    (elemento) => elemento.getAttribute('aria-hidden') !== 'true' && elemento.offsetParent !== null,
  );
}

/**
 * Diálogo modal accesible.
 *
 * - `role="dialog"` + `aria-modal` + nombre por `aria-labelledby`.
 * - Al abrir mueve el foco adentro; al cerrar lo devuelve a quien lo abrió.
 * - Tab y Mayús+Tab quedan atrapados; Escape cierra.
 * - Marca como `inert` el resto de la pantalla mientras está abierto.
 *
 * Se dibuja dentro del contenedor `[data-celeste]` para heredar los
 * tokens `--c-*` (un portal directo a `body` los perdería).
 */
export function Dialogo({
  abierto,
  alCerrar,
  etiquetadoPor,
  descritoPor,
  forma = 'centrado',
  cerrarConEscape = true,
  cerrarConFondo = true,
  enfoqueInicial,
  className,
  children,
}: DialogoProps) {
  const [raiz, setRaiz] = useState<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const alCerrarActual = useRef(alCerrar);
  alCerrarActual.current = alCerrar;

  useEffect(() => {
    setRaiz(document.querySelector<HTMLElement>('[data-celeste]') ?? document.body);
  }, []);

  // Foco: entra al abrir y regresa a quien lo abrió al cerrar.
  useEffect(() => {
    if (!abierto || !raiz) return undefined;

    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const contenedor = panel.current;
    if (contenedor) {
      const destino = enfoqueInicial?.current ?? enfocablesDe(contenedor)[0] ?? contenedor;
      destino.focus({ preventScroll: true });
    }

    // El resto de la pantalla no recibe foco ni lector mientras el diálogo está abierto.
    const marcados: HTMLElement[] = [];
    Array.from(raiz.children).forEach((hijo) => {
      if (hijo instanceof HTMLElement && !hijo.contains(contenedor) && !hijo.hasAttribute('inert')) {
        hijo.setAttribute('inert', '');
        marcados.push(hijo);
      }
    });

    const estiloPrevio = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    return () => {
      marcados.forEach((hijo) => hijo.removeAttribute('inert'));
      document.documentElement.style.overflow = estiloPrevio;
      if (previo && document.contains(previo)) {
        previo.focus({ preventScroll: true });
      }
    };
    // `enfoqueInicial` es una ref estable: no debe reabrir el efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, raiz]);

  const alTeclear = useCallback(
    (evento: EventoTeclado<HTMLDivElement>) => {
      if (evento.key === 'Escape' && cerrarConEscape) {
        evento.stopPropagation();
        alCerrarActual.current();
        return;
      }
      if (evento.key !== 'Tab' || !panel.current) return;

      const lista = enfocablesDe(panel.current);
      if (lista.length === 0) {
        evento.preventDefault();
        panel.current.focus();
        return;
      }
      const primero = lista[0] as HTMLElement;
      const ultimo = lista[lista.length - 1] as HTMLElement;
      const activo = document.activeElement;
      if (evento.shiftKey && (activo === primero || activo === panel.current)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    },
    [cerrarConEscape],
  );

  const alTocarFondo = (evento: EventoRaton<HTMLDivElement>) => {
    if (cerrarConFondo && evento.target === evento.currentTarget) {
      alCerrarActual.current();
    }
  };

  if (!abierto || !raiz) return null;

  return createPortal(
    // El fondo solo recoge el toque para cerrar; el teclado cierra con Escape (en el panel).
    <div className={`${styles.fondo} ${forma === 'hoja' ? styles.fondoHoja : ''}`} onMouseDown={alTocarFondo}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={etiquetadoPor}
        aria-describedby={descritoPor}
        tabIndex={-1}
        className={`${styles.panel} ${forma === 'hoja' ? styles.hoja : styles.centrado} ${className ?? ''}`}
        onKeyDown={alTeclear}
      >
        {children}
      </div>
    </div>,
    raiz,
  );
}
