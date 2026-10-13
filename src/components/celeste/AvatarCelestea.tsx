import { LogoCelestea } from './LogoCelestea';
import styles from './AvatarCelestea.module.css';

interface AvatarCelesteaProps {
  /** Diámetro del círculo, en px. */
  tamano?: number;
  /** Gira el símbolo mientras Celestea "piensa". */
  pensando?: boolean;
  /** Fondo del círculo: el de las tarjetas o el más oscuro de los paneles. */
  fondo?: 'tarjeta' | 'panel';
  className?: string;
}

/** Círculo con el símbolo de Celestea: marca los mensajes y respuestas de la asistente. */
export function AvatarCelestea({ tamano = 32, pensando = false, fondo = 'tarjeta', className }: AvatarCelesteaProps) {
  const clases = [styles.avatar, fondo === 'panel' ? styles.panel : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={clases} style={{ width: tamano, height: tamano }} aria-hidden="true">
      <LogoCelestea tamano={tamano <= 32 ? 20 : 22} girando={pensando} />
    </span>
  );
}
