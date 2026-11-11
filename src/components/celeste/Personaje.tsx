'use client';

import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { variablesCss } from './variablesCss';
import styles from './Personaje.module.css';

/**
 * Personaje de Celestea: la esfera que acompaña al alumno.
 *
 * - Es SVG/CSS propio (permitido junto al logo): una esfera con ojos que
 *   cambian de expresión según lo que pasa en la pantalla.
 * - Dos pieles: "azul" (la de siempre) y "celestia" (la que se desbloquea
 *   tras la primera defensa: cielo nocturno, constelación y una luna).
 * - Toda la geometría se calcula con `--o` (el diámetro), así que el mismo
 *   componente sirve desde 40 hasta 190 px.
 * - Con `layoutId`, framer-motion hace volar a la esfera de una pantalla a la
 *   siguiente. Es una mejora progresiva: sin él, cada pantalla la dibuja en
 *   su lugar. Con movimiento reducido, el vuelo se apaga solo.
 */

export type ExpresionPersonaje =
  | 'neutro'
  | 'atento'
  | 'escucha'
  | 'feliz'
  | 'confundido'
  | 'asombrado';

export type PielPersonaje = 'azul' | 'celestia';

export type MovimientoPersonaje =
  | 'quieto'
  | 'flotar'
  | 'latir'
  | 'respira'
  | 'saltar'
  | 'ladeo'
  | 'calma'
  | 'calma-rapida'
  | 'tiembla'
  | 'tiembla-fuerte'
  | 'celebrar';

interface PersonajeProps {
  /** Diámetro en px. */
  tamano: number;
  expresion?: ExpresionPersonaje;
  piel?: PielPersonaje;
  movimiento?: MovimientoPersonaje;
  /** Cantidad de anillos que se expanden alrededor (0 a 3). */
  ondas?: 0 | 1 | 2 | 3;
  /** Ritmo de las ondas, en segundos por ciclo. */
  ritmoOndas?: number;
  /**
   * Hacia dónde mira: una posición fija (como fracción del diámetro; x a la derecha,
   * y hacia abajo) o "alrededor", que recorre la escena de lado a lado.
   */
  mirada?: 'alrededor' | { x: number; y: number };
  /** Parpadea de vez en cuando (solo ojos neutros). */
  parpadea?: boolean;
  /** Segundos que dura cada ciclo de parpadeo; sirve para que no se sincronicen. */
  ritmoParpadeo?: number;
  /** Entra con un pequeño rebote al montarse. */
  entra?: boolean;
  /** Segundos de espera antes de ese rebote de entrada. */
  retrasoEntra?: number;
  /** Inclina la cabeza una vez, como quien se pregunta algo. */
  inclina?: boolean;
  /** Deja lista la capa de Celestia aunque la piel actual sea azul (para el desbloqueo). */
  preparaCelestia?: boolean;
  /** Identificador de vuelo compartido entre pantallas. */
  layoutId?: string;
  /**
   * Celestea está hablando (su voz suena). Marca `data-hablando` en la raíz para colgar ahí la
   * animación de la voz; el gesto visible lo dan las demás props (ondas, movimiento, expresión).
   */
  hablando?: boolean;
  /** Nombre accesible. Sin él, el personaje es decorativo. */
  etiqueta?: string;
  className?: string;
}

/** Posición de las estrellas dibujadas a mano para la constelación de Celestia. */
const LINEAS_CONSTELACION: readonly string[] = [
  'M62 78 L92 60 L126 70 L150 52 L178 74',
  'M70 162 L100 180 L134 170 L166 188',
  'M30 118 L46 94 L58 128',
  'M196 112 L214 134 L198 152',
  'M104 226 L120 214 L140 230',
  'M110 18 L132 26 L120 40',
];

const ESTRELLAS: readonly (readonly [number, number, number])[] = [
  [62, 78, 1.6],
  [92, 60, 2],
  [126, 70, 1.6],
  [178, 74, 1.8],
  [70, 162, 1.8],
  [134, 170, 1.6],
  [166, 188, 2],
  [30, 118, 1.6],
  [46, 94, 2],
  [58, 128, 1.4],
  [196, 112, 1.8],
  [214, 134, 1.6],
  [198, 152, 2],
  [104, 226, 1.6],
  [120, 214, 2],
  [140, 230, 1.4],
  [110, 18, 1.6],
  [132, 26, 2],
  [120, 40, 1.4],
];

const ESTRELLAS_DORADAS: readonly (readonly [number, number, number])[] = [
  [150, 52, 2.6],
  [100, 180, 2.4],
];

const POLVO: readonly (readonly [number, number, number])[] = [
  [80, 110, 0.9],
  [150, 122, 0.9],
  [40, 60, 0.8],
  [190, 40, 0.9],
  [20, 170, 0.8],
  [210, 190, 0.9],
  [160, 150, 0.8],
  [90, 140, 0.9],
  [130, 98, 0.8],
  [60, 200, 0.9],
  [180, 210, 0.8],
  [24, 80, 0.9],
  [220, 90, 0.8],
  [70, 30, 0.9],
  [170, 100, 0.8],
  [120, 150, 0.9],
];

function Constelacion() {
  return (
    <svg className={styles.constelacionSvg} width="240" height="240" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <g className={styles.lineas}>
        {LINEAS_CONSTELACION.map((trazo) => (
          <path key={trazo} d={trazo} />
        ))}
      </g>
      <g className={styles.estrellas}>
        {ESTRELLAS.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <g className={styles.estrellasDoradas}>
        {ESTRELLAS_DORADAS.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <g className={styles.polvo}>
        {POLVO.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}

const CLASE_MOVIMIENTO: Readonly<Record<MovimientoPersonaje, string>> = {
  quieto: '',
  flotar: styles.flotar ?? '',
  latir: styles.latir ?? '',
  respira: styles.respira ?? '',
  saltar: styles.saltar ?? '',
  ladeo: styles.ladeo ?? '',
  calma: styles.calma ?? '',
  'calma-rapida': styles.calmaRapida ?? '',
  tiembla: styles.tiembla ?? '',
  'tiembla-fuerte': styles.tiemblaFuerte ?? '',
  celebrar: styles.celebrar ?? '',
};

export function Personaje({
  tamano,
  expresion = 'neutro',
  piel = 'azul',
  movimiento = 'quieto',
  ondas = 0,
  ritmoOndas = 2.4,
  mirada,
  parpadea = true,
  ritmoParpadeo = 4.2,
  entra = false,
  retrasoEntra = 0,
  inclina = false,
  preparaCelestia = false,
  layoutId,
  hablando = false,
  etiqueta,
  className,
}: PersonajeProps) {
  const grande = tamano >= 100;
  const celestia = piel === 'celestia';
  const conCapaCeleste = celestia || preparaCelestia;
  const completa = conCapaCeleste && tamano >= 64;

  const clasesRaiz = [styles.personaje, entra ? styles.entra : '', className ?? ''].filter(Boolean).join(' ');
  const clasesCara = [
    styles.cara,
    grande ? styles.caraGrande : styles.caraChica,
    styles[`expresion-${expresion}`] ?? '',
    celestia ? styles.tintaClara : '',
    mirada === 'alrededor' ? styles.miraAlrededor : '',
    parpadea && (expresion === 'neutro' || expresion === 'atento') ? styles.parpadea : '',
  ]
    .filter(Boolean)
    .join(' ');

  const estiloRaiz: CSSProperties = variablesCss({
    '--o': `${tamano}px`,
    '--ritmo-ondas': `${ritmoOndas}s`,
    '--ritmo-parpadeo': `${ritmoParpadeo}s`,
    '--retraso-entra': `${retrasoEntra}s`,
    '--mx': typeof mirada === 'object' ? mirada.x : 0,
    '--my': typeof mirada === 'object' ? mirada.y : 0,
  });

  const accesibilidad = etiqueta
    ? ({ role: 'img', 'aria-label': etiqueta } as const)
    : ({ 'aria-hidden': true } as const);
  const senalDeVoz = { 'data-hablando': hablando ? 'true' : undefined };

  const anillos = Array.from({ length: ondas }, (_, indice) => (
    <span
      key={indice}
      className={styles.onda}
      style={variablesCss({ '--retraso-onda': `${(indice * ritmoOndas) / Math.max(ondas, 1)}s` })}
    />
  ));

  const contenido = (
    <>
      {anillos}
      <span className={`${styles.movimiento} ${CLASE_MOVIMIENTO[movimiento]}`}>
        <span className={inclina ? `${styles.balanceo} ${styles.inclina}` : styles.balanceo}>
          <span className={styles.esfera} />
          {conCapaCeleste ? (
            <span className={`${styles.celeste} ${celestia ? styles.celesteVisible : ''}`}>
              {completa ? (
                <>
                  <span className={styles.constelacion}>
                    <Constelacion />
                  </span>
                  <span className={styles.vidrio} />
                </>
              ) : (
                <>
                  <span className={styles.puntoBlanco} />
                  <span className={styles.puntoDorado} />
                </>
              )}
            </span>
          ) : null}
          {conCapaCeleste && completa ? (
            <span className={`${styles.orbita} ${celestia ? styles.celesteVisible : ''}`}>
              <span className={styles.orbitaTrazo} />
              <span className={styles.orbitaGiro}>
                <span className={styles.lunaContragiro}>
                  <span className={styles.lunaAplanada}>
                    <span className={styles.luna} />
                  </span>
                </span>
              </span>
            </span>
          ) : null}
          <span className={clasesCara}>
            {expresion === 'confundido' ? (
              <>
                <span className={styles.ojo} />
                <span className={styles.raya} />
              </>
            ) : (
              <>
                <span className={styles.ojo} />
                <span className={styles.ojo} />
              </>
            )}
          </span>
        </span>
      </span>
    </>
  );

  if (layoutId) {
    return (
      <motion.span
        layoutId={layoutId}
        className={clasesRaiz}
        style={estiloRaiz}
        transition={{ layout: { duration: 0.95, ease: [0.68, -0.35, 0.27, 1.35] } }}
        {...accesibilidad}
        {...senalDeVoz}
      >
        {contenido}
      </motion.span>
    );
  }

  return (
    <span className={clasesRaiz} style={estiloRaiz} {...accesibilidad} {...senalDeVoz}>
      {contenido}
    </span>
  );
}
