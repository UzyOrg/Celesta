import { ArrowRight } from 'lucide-react';
import { AvatarCelestea } from '../celeste/AvatarCelestea';
import { OBJETIVOS_PROPUESTOS } from './nueva';
import { Pildora } from './Pildora';
import type { MensajeNueva } from './types';
import styles from './HiloDeNueva.module.css';

interface HiloDeNuevaProps {
  mensajes: readonly MensajeNueva[];
  /** Qué objetivos propuestos siguen marcados. */
  activos: readonly boolean[];
  alAlternarObjetivo: (indice: number) => void;
  pensando: boolean;
  textoPensando: string;
  /** El borrador está completo y queda al menos un objetivo. */
  puedeCrearEnlace: boolean;
  rutaEnlace: string;
  alEditarAMano: () => void;
}

/**
 * La conversación de "Nueva actividad": preguntas de Celestea a la izquierda,
 * respuestas del profesor a la derecha. El mensaje de los objetivos lleva
 * casillas para quitar los que no se quieren, y el último lleva las acciones
 * para crear el enlace.
 */
export function HiloDeNueva({
  mensajes,
  activos,
  alAlternarObjetivo,
  pensando,
  textoPensando,
  puedeCrearEnlace,
  rutaEnlace,
  alEditarAMano,
}: HiloDeNuevaProps) {
  return (
    <div className={styles.hilo}>
      {mensajes.map((mensaje) =>
        mensaje.autor === 'celestea' ? (
          <div key={mensaje.id} className={styles.celestea}>
            <AvatarCelestea tamano={32} />
            <div className={styles.contenido}>
              <p className={styles.texto}>{mensaje.texto}</p>

              {mensaje.conObjetivos ? (
                <div role="group" aria-label="Objetivos propuestos" className={styles.objetivos}>
                  {OBJETIVOS_PROPUESTOS.map((objetivo, indice) => {
                    const activo = activos[indice] ?? false;
                    return (
                      <label key={objetivo.texto} className={styles.objetivo}>
                        <input
                          type="checkbox"
                          className={styles.casilla}
                          checked={activo}
                          onChange={() => alAlternarObjetivo(indice)}
                        />
                        <span className={styles.objetivoTextos}>
                          <span className={activo ? styles.objetivoTitulo : `${styles.objetivoTitulo} ${styles.apagado}`}>
                            {objetivo.texto}
                          </span>
                          <span className={styles.criterio}>{`Criterio ${objetivo.criterio} de tu rúbrica`}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {mensaje.conAcciones ? (
                <div className={styles.acciones}>
                  {puedeCrearEnlace ? (
                    <Pildora
                      href={rutaEnlace}
                      alto={48}
                      relleno={22}
                      letra={15.5}
                      peso={650}
                      espacio={8}
                      icono={<ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />}
                      iconoAlFinal
                    >
                      Crear enlace
                    </Pildora>
                  ) : null}
                  <Pildora variante="contorno" alto={48} relleno={20} letra={15.5} peso={600} onClick={alEditarAMano}>
                    Editar a mano
                  </Pildora>
                  {!puedeCrearEnlace ? (
                    <p className={styles.pista}>Deja al menos un objetivo marcado para crear el enlace.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div key={mensaje.id} className={styles.profesor}>
            <div className={styles.burbuja}>{mensaje.texto}</div>
          </div>
        ),
      )}

      {pensando ? (
        <div className={styles.pensando}>
          <AvatarCelestea tamano={32} pensando />
          <span className={styles.textoPensando}>{textoPensando}</span>
        </div>
      ) : null}
    </div>
  );
}
