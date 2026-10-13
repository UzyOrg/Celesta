import { tinteDeAvatar } from './tintes';
import type { TinteAvatar } from './types';
import { variablesCss } from './variablesCss';
import styles from './Avatar.module.css';

interface AvatarProps {
  iniciales: string;
  /** Nombre natural ("Ana Torres Ruiz"): decide el color, siempre el mismo para la misma persona. */
  nombre?: string;
  /** Color fijo (p. ej. el de quien usa la sesión). Tiene prioridad sobre `nombre`. */
  tinte?: TinteAvatar;
  /** Diámetro en px. */
  tamano?: 32 | 34 | 36 | 40 | 48 | 60 | 64;
  className?: string;
}

/** Tamaño de letra por diámetro, medido sobre el diseño. */
const LETRA: Readonly<Record<NonNullable<AvatarProps['tamano']>, string>> = {
  32: '12px',
  34: '12px',
  36: '12.5px',
  40: '14px',
  48: '16px',
  60: '20px',
  64: '21px',
};

const TINTE_NEUTRO: TinteAvatar = { fondo: '#16203A', tinta: '#8CC8FF' };

/** Círculo con iniciales. Decorativo: el nombre completo siempre va en texto junto a él. */
export function Avatar({ iniciales, nombre, tinte, tamano = 36, className }: AvatarProps) {
  const color = tinte ?? (nombre ? tinteDeAvatar(nombre) : TINTE_NEUTRO);
  return (
    <span
      className={className ? `${styles.avatar} ${className}` : styles.avatar}
      style={variablesCss({
        '--lado': `${tamano}px`,
        '--letra': LETRA[tamano],
        '--fondo-avatar': color.fondo,
        '--tinta-avatar': color.tinta,
      })}
      aria-hidden="true"
    >
      {iniciales}
    </span>
  );
}
