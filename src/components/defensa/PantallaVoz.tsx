import { Check, Keyboard, Mic } from 'lucide-react';
import type { ModoDeRespuesta } from './pasos';
import { BarrasDeVoz } from '@/components/celeste/BarrasDeVoz';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import { CabezaConBurbuja } from './CabezaConBurbuja';
import styles from './PantallaVoz.module.css';

interface PantallaVozProps {
  modo: ModoDeRespuesta;
  alElegir: (modo: ModoDeRespuesta) => void;
  alSeguir: () => void;
}

/** Paso 4: hablar o escribir. Las dos opciones son iguales de importantes. */
export function PantallaVoz({ modo, alElegir, alSeguir }: PantallaVozProps) {
  const habla = modo === 'voz';

  return (
    <div className={styles.raiz}>
      <CabezaConBurbuja
        personaje={<Personaje tamano={56} movimiento="flotar" ritmoParpadeo={4} layoutId="orbe" />}
        titulo="¿Hablas o escribes?"
      />

      <div className={styles.opciones} role="group" aria-label="¿Hablas o escribes?">
        <button
          type="button"
          aria-pressed={habla}
          className={`${styles.opcion} ${habla ? styles.activa : ''} ${animaciones.entra}`}
          style={retraso(0.3, 0.5)}
          onClick={() => alElegir('voz')}
        >
          {habla ? (
            <span className={styles.marca} aria-hidden="true">
              <Check size={14} strokeWidth={3} />
            </span>
          ) : null}
          <span className={styles.arriba}>
            <span className={styles.circulo}>
              <Mic size={22} strokeWidth={2} aria-hidden="true" />
            </span>
            <BarrasDeVoz preset="opcion" />
          </span>
          <span className={styles.textos}>
            <span className={styles.nombre}>Hablar</span>
            <span className={styles.detalle}>Tu audio se borra en 7 días.</span>
          </span>
        </button>

        <button
          type="button"
          aria-pressed={!habla}
          className={`${styles.opcion} ${!habla ? styles.activa : ''} ${animaciones.entra}`}
          style={retraso(0.42, 0.5)}
          onClick={() => alElegir('escrito')}
        >
          {!habla ? (
            <span className={styles.marca} aria-hidden="true">
              <Check size={14} strokeWidth={3} />
            </span>
          ) : null}
          <span className={styles.arriba}>
            <span className={styles.circulo}>
              <Keyboard size={22} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className={styles.muestra} aria-hidden="true">
              Elegí la encuesta porque
              <span className={styles.cursor} />
            </span>
          </span>
          <span className={styles.textos}>
            <span className={styles.nombre}>Escribir</span>
            <span className={styles.detalle}>Sin explicar por qué.</span>
          </span>
        </button>
      </div>

      <p className={`${styles.nota} ${animaciones.entra}`} style={retraso(0.55, 0.5)}>
        Cambia cuando quieras.
      </p>

      <div className={styles.relleno} />

      <Boton tamano={64} onClick={alSeguir}>
        Seguir
      </Boton>
    </div>
  );
}
