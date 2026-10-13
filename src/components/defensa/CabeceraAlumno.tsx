import { Check, ChevronLeft, X } from 'lucide-react';
import { variablesCss } from '@/components/celeste/variablesCss';
import styles from './CabeceraAlumno.module.css';

interface CabeceraMarca {
  tipo: 'marca';
}

interface CabeceraProgreso {
  tipo: 'progreso';
  /** Avance de 0 a 1. */
  progreso: number;
  /** Sin esta función no se dibuja el botón "Volver". */
  alVolver?: () => void;
}

interface CabeceraCentrada {
  tipo: 'centrada';
  texto: string;
}

interface CabeceraDefensa {
  tipo: 'defensa';
  texto: string;
  etiquetaSalir: string;
  alSalir: () => void;
}

interface CabeceraEntrega {
  tipo: 'entrega';
  texto: string;
  alOmitir: () => void;
}

interface CabeceraNinguna {
  tipo: 'ninguna';
}

export type CabeceraAlumnoProps =
  | CabeceraMarca
  | CabeceraProgreso
  | CabeceraCentrada
  | CabeceraDefensa
  | CabeceraEntrega
  | CabeceraNinguna;

/** Cabecera de 56 px. Cada tipo corresponde a una familia de pantallas del diseño. */
export function CabeceraAlumno(props: CabeceraAlumnoProps) {
  switch (props.tipo) {
    case 'marca':
      return (
        <header className={`${styles.cabecera} ${styles.marca}`}>
          <span className={styles.nombre}>celestea</span>
        </header>
      );

    case 'progreso':
      return (
        <header className={`${styles.cabecera} ${props.alVolver ? styles.progreso : styles.progresoSinVolver}`}>
          {props.alVolver ? (
            <button type="button" className={styles.boton} aria-label="Volver" onClick={props.alVolver}>
              <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
          <div className={styles.pista} aria-hidden="true">
            <div className={styles.relleno} style={variablesCss({ '--avance': props.progreso })} />
          </div>
        </header>
      );

    case 'centrada':
      return (
        <header className={`${styles.cabecera} ${styles.centrada}`}>
          <span className={styles.etiqueta}>{props.texto}</span>
        </header>
      );

    case 'defensa':
      return (
        <header className={`${styles.cabecera} ${styles.defensa}`}>
          <button type="button" className={styles.boton} aria-label={props.etiquetaSalir} onClick={props.alSalir}>
            <X size={22} strokeWidth={2} aria-hidden="true" />
          </button>
          <span className={styles.etiqueta}>{props.texto}</span>
          <span className={styles.espacio} aria-hidden="true" />
        </header>
      );

    case 'entrega':
      return (
        <header className={`${styles.cabecera} ${styles.entrega}`}>
          <span className={styles.sello}>
            <Check size={12} strokeWidth={3} aria-hidden="true" />
            {props.texto}
          </span>
          <button type="button" className={styles.omitir} onClick={props.alOmitir}>
            Omitir
          </button>
        </header>
      );

    case 'ninguna':
      return null;

    default:
      return null;
  }
}
