import { Flag, Pencil } from 'lucide-react';
import type { ActividadAlumno, BloqueRevision, LineaRevision } from './types';
import type { ModoDeRespuesta } from './pasos';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './PantallaRevisar.module.css';

interface PantallaRevisarProps {
  actividad: ActividadAlumno;
  modo: ModoDeRespuesta;
  /** Líneas marcadas con "No lo dije así", por identificador. */
  marcas: Readonly<Record<string, boolean>>;
  alAlternarMarca: (idLinea: string) => void;
  /** Respuestas escritas durante la defensa, por identificador de pregunta. */
  respuestasEscritas: Readonly<Record<string, string>>;
  /** Lo que la persona escribió al aclarar (vacío si lo dijo en voz alta). */
  aclaracionEscrita: string;
}

/** Texto plano de una línea de transcripción. */
function textoDeLinea(linea: LineaRevision): string {
  return linea.segmentos.map((segmento) => segmento.texto).join('');
}

/** Respuesta por escrito del bloque: lo tecleado, o la versión de ejemplo. */
function textoEscritoDe(bloque: BloqueRevision, escritas: Readonly<Record<string, string>>): string {
  const tecleado = escritas[bloque.pregunta.id];
  if (tecleado && tecleado.trim().length > 0) return tecleado.trim();
  if (bloque.porEscrito) return bloque.porEscrito;
  return (bloque.lineas ?? []).map(textoDeLinea).join(' ');
}

/** Paso 13: la persona revisa su transcripción y marca lo que no dijo así. */
export function PantallaRevisar({
  actividad,
  modo,
  marcas,
  alAlternarMarca,
  respuestasEscritas,
  aclaracionEscrita,
}: PantallaRevisarProps) {
  return (
    <div className={styles.raiz}>
      <section className={`${styles.titulos} ${animaciones.entra}`} style={retraso(0.05)}>
        <h1 className={styles.titulo}>Revisa tu transcripción</h1>
        <p className={styles.indicacion}>Toca lo que no dijiste así.</p>
      </section>

      {actividad.revision.map((bloque, indiceBloque) => {
        const escrito = modo === 'escrito' || !bloque.lineas;
        return (
          <section
            key={bloque.pregunta.id}
            className={`${styles.bloque} ${animaciones.entra}`}
            style={retraso(0.2 + indiceBloque * 0.15)}
            aria-label={`Pregunta ${bloque.pregunta.numero}`}
          >
            <div className={styles.cabeza}>
              <span className={styles.numero} aria-hidden="true">
                {bloque.pregunta.numero}
              </span>
              <p className={styles.preguntaTexto}>
                {bloque.pregunta.contexto} {bloque.pregunta.pregunta}
              </p>
            </div>

            {escrito ? (
              <div className={styles.escrito}>
                <span className={styles.lapiz}>
                  <Pencil size={16} strokeWidth={2} role="img" aria-label="Por escrito" />
                </span>
                <span>{textoEscritoDe(bloque, respuestasEscritas)}</span>
              </div>
            ) : (
              (bloque.lineas ?? []).map((linea) => {
                const marcada = marcas[linea.id] ?? false;
                return (
                  <button
                    key={linea.id}
                    type="button"
                    aria-pressed={marcada}
                    className={`${styles.linea} ${marcada ? styles.marcada : ''}`}
                    onClick={() => alAlternarMarca(linea.id)}
                  >
                    <span className={styles.tiempo}>{linea.tiempo}</span>
                    <span className={styles.contenido}>
                      <span>
                        {linea.segmentos.map((segmento) =>
                          segmento.aclarado ? (
                            <span key={segmento.texto} className={styles.aclarado}>
                              {aclaracionEscrita.trim().length > 0 ? aclaracionEscrita.trim() : segmento.texto}
                            </span>
                          ) : (
                            <span key={segmento.texto}>{segmento.texto}</span>
                          ),
                        )}
                      </span>
                      {marcada ? (
                        <span className={`${styles.etiqueta} ${styles.etiquetaMarca} ${animaciones.pop}`} style={retraso(0, 0.5)}>
                          <Flag size={12} strokeWidth={2.5} aria-hidden="true" />
                          No lo dije así
                        </span>
                      ) : null}
                      {linea.aclarada ? <span className={`${styles.etiqueta} ${styles.etiquetaAclarado}`}>Aclarado</span> : null}
                    </span>
                  </button>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
}
