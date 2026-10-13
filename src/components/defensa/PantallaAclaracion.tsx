import { useEffect, useId, useRef, useState } from 'react';
import { Mic, Pause, Pencil, Play, Shield } from 'lucide-react';
import type { ActividadAlumno } from './types';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import { CabezaConBurbuja } from './CabezaConBurbuja';
import styles from './PantallaAclaracion.module.css';

interface PantallaAclaracionProps {
  aclaracion: ActividadAlumno['aclaracion'];
  /** Lo que la persona escribió para llenar el hueco (vacío si todavía nada). */
  textoEscrito: string;
  alCambiarTexto: (texto: string) => void;
  alListo: () => void;
}

/**
 * Altura de cada barra de la forma de onda: [antes del hueco, el hueco, después].
 * El hueco (la parte que no se entendió) va resaltado en acento.
 */
const ONDA_ANTES: readonly number[] = [6, 10, 14, 10, 6, 8, 12, 18, 14, 8, 6, 10, 16, 22, 18, 12, 8, 6];
const ONDA_HUECO: readonly number[] = [14, 20, 26, 22, 16, 24, 18, 12];
const ONDA_DESPUES: readonly number[] = [8, 10, 14, 18, 12, 8, 6, 10, 14, 10, 6, 8, 6, 4];
const PASO_BARRA = 6;
const MILISEGUNDOS_DE_AUDIO = 2200;

function Onda({ alturas, desde, clase }: { alturas: readonly number[]; desde: number; clase: string }) {
  return (
    <g className={clase}>
      {alturas.map((alto, indice) => (
        <rect
          key={desde + indice * PASO_BARRA}
          x={desde + indice * PASO_BARRA}
          y={16 - alto / 2}
          width="3"
          height={alto}
          rx="1.5"
        />
      ))}
    </g>
  );
}

/** Paso 12: la IA no entendió una parte y la persona puede oírla, decirla otra vez o escribirla. */
export function PantallaAclaracion({ aclaracion, textoEscrito, alCambiarTexto, alListo }: PantallaAclaracionProps) {
  const idCampo = useId();
  const [escribiendo, setEscribiendo] = useState(false);
  const [oyendo, setOyendo] = useState(false);
  const temporizador = useRef<number | null>(null);
  const sinTexto = textoEscrito.trim().length === 0;

  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    },
    [],
  );

  // El prototipo no tiene audio real: "oír" solo recorre la forma de onda durante unos segundos.
  const alternarAudio = () => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    if (oyendo) {
      setOyendo(false);
      return;
    }
    setOyendo(true);
    temporizador.current = window.setTimeout(() => setOyendo(false), MILISEGUNDOS_DE_AUDIO);
  };

  return (
    <div className={styles.raiz}>
      <span className={styles.reloj}>
        <Pause size={11} strokeWidth={3} aria-hidden="true" />
        Reloj en pausa
      </span>

      <div className={styles.cabeza}>
        <CabezaConBurbuja
          personaje={
            <Personaje tamano={64} expresion="confundido" movimiento="ladeo" parpadea={false} layoutId="orbe" />
          }
          titulo="No te entendí esta parte."
          tamanoTitulo="menor"
        />
      </div>

      <p className={`${styles.frase} ${animaciones.entra}`} style={retraso(0.3)}>
        {aclaracion.antes}{' '}
        <span
          className={`${styles.hueco} ${escribiendo && !sinTexto ? styles.huecoLleno : ''}`}
          role="img"
          aria-label={
            escribiendo && !sinTexto ? `lo que escribiste: ${textoEscrito}` : 'hueco: la parte que no se entendió'
          }
        >
          {escribiendo && !sinTexto ? (
            <span className={styles.relleno}>{textoEscrito}</span>
          ) : (
            <>
              <span className={styles.pulso} />
              <span className={styles.cursor} />
            </>
          )}
        </span>{' '}
        {aclaracion.despues}
      </p>

      <button
        type="button"
        className={`${styles.oir} ${animaciones.entra}`}
        style={retraso(0.45)}
        aria-pressed={oyendo}
        onClick={alternarAudio}
      >
        <span className={styles.reproducir}>
          {oyendo ? (
            <Pause size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          ) : (
            <Play size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          )}
        </span>
        <span className={styles.oirTextos}>
          <span className={styles.oirTitulo}>{oyendo ? 'Oyendo esa parte' : 'Oír esa parte'}</span>
          <svg className={styles.onda} height="28" viewBox="0 0 240 32" aria-hidden="true">
            <rect className={styles.zonaHueco} x="105" y="0" width="51" height="32" rx="4" />
            <Onda alturas={ONDA_ANTES} desde={0} clase={styles.barraApagada ?? ''} />
            <Onda alturas={ONDA_DESPUES} desde={156} clase={styles.barraApagada ?? ''} />
            <Onda alturas={ONDA_HUECO} desde={108} clase={styles.barraAcento ?? ''} />
            <rect
              className={`${styles.cabezal} ${oyendo ? styles.cabezalActivo : ''}`}
              x="105"
              y="0"
              width="2"
              height="32"
              rx="1"
            />
          </svg>
        </span>
      </button>

      <p className={styles.garantia}>
        <Shield size={16} strokeWidth={2} aria-hidden="true" />
        Si no se entiende, no cuenta en tu contra.
      </p>

      <div className={styles.espacio} />

      {escribiendo ? (
        <div className={styles.escribir}>
          <div className={styles.campo}>
            <label className={styles.etiqueta} htmlFor={idCampo}>
              Escribe esa parte
            </label>
            <input
              id={idCampo}
              className={styles.entrada}
              type="text"
              value={textoEscrito}
              placeholder={aclaracion.relleno}
              autoComplete="off"
              onChange={(evento) => alCambiarTexto(evento.target.value)}
            />
          </div>
          <div className={styles.acciones}>
            <Boton variante="contorno" tamano={56} icono={<Mic size={18} strokeWidth={1.9} />} onClick={() => setEscribiendo(false)}>
              Mejor la digo
            </Boton>
            <Boton
              tamano={64}
              aria-disabled={sinTexto}
              onClick={() => {
                if (!sinTexto) alListo();
              }}
            >
              Listo
            </Boton>
          </div>
        </div>
      ) : (
        <div className={styles.acciones}>
          <Boton variante="contorno" tamano={56} icono={<Pencil size={18} strokeWidth={1.9} />} onClick={() => setEscribiendo(true)}>
            Escribirlo
          </Boton>
          <Boton tamano={64} icono={<Mic size={20} strokeWidth={2} />} onClick={alListo}>
            Decirlo
          </Boton>
        </div>
      )}
    </div>
  );
}
