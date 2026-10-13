import { Flag, Pencil } from 'lucide-react';
import type { BloqueRevision } from './types';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './PantallaRevisar.module.css';

interface PantallaRevisarProps {
  /** Cada pregunta con lo que la persona respondió, ya con la aclaración aplicada. */
  bloques: readonly BloqueRevision[];
  /** Líneas marcadas con "No lo dije así", por identificador. */
  marcas: Readonly<Record<string, boolean>>;
  alAlternarMarca: (idLinea: string) => void;
}

/** Paso 13: la persona revisa su transcripción y marca lo que no dijo así. */
export function PantallaRevisar({ bloques, marcas, alAlternarMarca }: PantallaRevisarProps) {
  return (
    <div className={styles.raiz}>
      <section className={`${styles.titulos} ${animaciones.entra}`} style={retraso(0.05)}>
        <h1 className={styles.titulo}>Revisa tu transcripción</h1>
        <p className={styles.indicacion}>Toca lo que no dijiste así.</p>
      </section>

      {bloques.map((bloque, indiceBloque) => {
        const escrito = !bloque.lineas;
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
                <span>{bloque.porEscrito ?? ''}</span>
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
                        {linea.segmentos.map((segmento, posicion) =>
                          segmento.aclarado ? (
                            <span key={`${posicion}-${segmento.texto}`} className={styles.aclarado}>
                              {segmento.texto}
                            </span>
                          ) : (
                            <span key={`${posicion}-${segmento.texto}`}>{segmento.texto}</span>
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
