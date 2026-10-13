import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '../celeste/Avatar';
import { LogoCelestea } from '../celeste/LogoCelestea';
import type { MenuLateral } from './derivados';
import type { Profesora } from './types';
import styles from './BarraLateral.module.css';

interface BarraLateralProps {
  /** Código de la actividad: las rutas del menú cuelgan de `/revision/<token>`. */
  token: string;
  menu: MenuLateral;
  profesora: Profesora;
  /** Se queda fija mientras se desplaza una página larga (reporte, enlace). */
  fija?: boolean;
  /**
   * Versión de fondo, sin enlaces ni datos de la sesión: la que se ve borrosa
   * detrás de un diálogo que bloquea la pantalla.
   */
  decorativa?: boolean;
}

/** Menú lateral del profesor: marca, nueva actividad, actividades y quién usa la sesión. */
export function BarraLateral({ token, menu, profesora, fija = false, decorativa = false }: BarraLateralProps) {
  const rutaGrupo = `/revision/${token}`;
  const clases = fija ? `${styles.lateral} ${styles.fija}` : styles.lateral;

  if (decorativa) {
    return (
      <aside aria-hidden="true" className={clases}>
        <div className={styles.marca}>
          <LogoCelestea tamano={28} conNombre />
        </div>
        {menu.sinNueva ? null : <div className={styles.nueva}>Nueva actividad</div>}
        <div className={styles.actividades}>
          <span className={styles.titulo}>Actividades</span>
          {menu.entradas.map((entrada) => (
            <div
              key={entrada.id}
              className={entrada.activa ? `${styles.entrada} ${styles.entradaActiva}` : styles.entrada}
            >
              <span className={styles.entradaNombre}>{entrada.nombre}</span>
              <span className={styles.entradaDetalle}>{entrada.detalle}</span>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Menú" className={clases}>
      <div className={styles.marca}>
        <LogoCelestea tamano={28} conNombre />
      </div>

      {menu.sinNueva ? null : (
        <Link
          href={`${rutaGrupo}/nueva`}
          className={menu.nuevaActiva ? `${styles.nueva} ${styles.nuevaActiva}` : styles.nueva}
          aria-current={menu.nuevaActiva ? 'page' : undefined}
        >
          <Plus size={18} strokeWidth={2} strokeLinecap="round" aria-hidden="true" />
          Nueva actividad
        </Link>
      )}

      <nav aria-label="Actividades" className={styles.actividades}>
        <span className={styles.titulo}>Actividades</span>
        {menu.entradas.map((entrada) => (
          <Link
            key={entrada.id}
            href={rutaGrupo}
            aria-current={entrada.activa ? 'page' : undefined}
            className={entrada.activa ? `${styles.entrada} ${styles.entradaActiva}` : styles.entrada}
          >
            <span className={styles.entradaNombre}>{entrada.nombre}</span>
            <span className={styles.entradaDetalle}>{entrada.detalle}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.espacio} />

      <div className={styles.usuario}>
        <Avatar iniciales={profesora.iniciales} tamano={36} />
        <div className={styles.usuarioTextos}>
          <span className={styles.usuarioNombre}>{profesora.nombre}</span>
          <span className={styles.usuarioRol}>{profesora.rol}</span>
        </div>
      </div>
    </aside>
  );
}
