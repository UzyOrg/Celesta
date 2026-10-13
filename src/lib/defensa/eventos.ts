import 'server-only';
import type { IngestEvent, JsonValue, LearningEventInsertRow } from '../events/ingestPolicy';
import type { RepoDefensa } from './almacen/tipos';

/**
 * Eventos de las defensas en eventos_de_aprendizaje.
 *
 * No se cambia el esquema ni se inventa un verbo: se usan los mismos seis y el
 * detalle va dentro de `result`. Los eventos llevan medidas e ids, nunca texto:
 * ni lo que dijo el alumno, ni su nombre, ni el trabajo.
 *
 * Los escribe solo el servidor. Su `taller_id` empieza con "defensa:", un prefijo
 * que la ingesta pública rechaza (ver esTallerIdReservado), así que ningún
 * navegador puede fabricarlos.
 *
 * Cada evento lleva un `client_event_id` determinista: un reintento (una subida
 * repetida, una respuesta que se vuelve a enviar) no deja una segunda fila.
 */

export type VerboEvento = IngestEvent['verbo'];

/** Solo valores planos y cortos: así un texto largo no puede colarse en un evento. */
export type MedidaEvento = string | number | boolean | null;
export type MedidasEvento = Readonly<Record<string, MedidaEvento>>;

const MAX_TEXTO_MEDIDA = 64;

export const PREFIJO_TALLER = 'defensa:';
export const tallerIdDeActividad = (actividadId: string) => `${PREFIJO_TALLER}${actividadId}`;

export interface EventoDefensa {
  verbo: VerboEvento;
  /** Qué pasó, en una palabra estable: "entrega", "respuesta", "toque_profesor"... */
  evento: string;
  pasoId: string;
  actividadId: string;
  /** Quién lo hizo: el id del alumno, o el de la actividad si fue el profesor. */
  actorId: string;
  /** Distingue un evento de otro igual; con la misma clave, el segundo no se guarda. */
  clave: string;
  medidas: MedidasEvento;
}

function medidaSegura(valor: MedidaEvento): MedidaEvento {
  if (typeof valor === 'string' && valor.length > MAX_TEXTO_MEDIDA) return '[omitido]';
  if (typeof valor === 'number' && !Number.isFinite(valor)) return null;
  return valor;
}

export function filaDeEvento(evento: EventoDefensa, ahora: Date): LearningEventInsertRow {
  const iso = ahora.toISOString();
  const result: Record<string, JsonValue> = { evento: evento.evento, actividadId: evento.actividadId };
  for (const [clave, valor] of Object.entries(evento.medidas)) result[clave] = medidaSegura(valor);
  return {
    client_event_id: `def:${evento.evento}:${evento.clave}`.slice(0, 160),
    actor_sid: evento.actorId,
    student_session_id: evento.actorId,
    // Ni alias ni código de clase: estos eventos no se unen con los lectores del producto anterior.
    student_alias: null,
    class_token: null,
    taller_id: tallerIdDeActividad(evento.actividadId),
    paso_id: evento.pasoId.slice(0, 160),
    verbo: evento.verbo,
    result,
    ts: iso,
    client_ts: iso,
  };
}

export interface EmisorEventos {
  emitir(...eventos: EventoDefensa[]): Promise<void>;
}

/**
 * Escribe los eventos sin que una falla de la telemetría pueda tumbar la defensa:
 * si la base no responde, el alumno sigue y el error queda en el registro.
 */
export function crearEmisor(repo: RepoDefensa, ahora: () => Date): EmisorEventos {
  return {
    async emitir(...eventos) {
      if (eventos.length === 0) return;
      try {
        const momento = ahora();
        await repo.insertarEventos(eventos.map((evento) => filaDeEvento(evento, momento)));
      } catch (error) {
        console.error('defensa_eventos_fallaron', { cantidad: eventos.length, nombre: error instanceof Error ? error.name : 'desconocido' });
      }
    },
  };
}
