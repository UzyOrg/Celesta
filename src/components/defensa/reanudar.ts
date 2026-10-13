import type { DefensaCliente, EstadoSesionCliente } from './contrato';
import type { ContextoDeAlcance, PasoAlumnoId } from './pasos';
import type { BloqueRevision } from './types';

/**
 * Qué mostrar cuando el servidor dice en qué punto va una persona: al abrir el enlace en
 * otro teléfono, al recargar o al volver de una falla de red. Funciones puras, con pruebas.
 */

/** A qué paso llevar a quien ya tiene una defensa abierta o terminada. */
export function pasoDeDefensa(defensa: DefensaCliente): PasoAlumnoId {
  switch (defensa.estado) {
    case 'en_curso':
      if (defensa.aclaracion) return 'aclaracion';
      return defensa.pregunta ? 'pregunta' : 'respira';
    case 'por_revisar':
      return 'revisar';
    case 'entregada':
      if (!defensa.estresRespondido) return 'estres';
      return defensa.esEnsayo ? 'respira' : 'listo';
    default:
      return 'respira';
  }
}

/** Dónde retomar: lo que ya hizo manda, y el ensayo solo si no hay una defensa de verdad. */
export function pasoDeReanudacion(estado: EstadoSesionCliente): PasoAlumnoId {
  if (!estado.entrega) return 'trabajo';
  const defensa = defensaEnPantalla(estado);
  if (defensa) return pasoDeDefensa(defensa);
  return 'respira';
}

export function estaViva(defensa: DefensaCliente | null): defensa is DefensaCliente {
  return defensa !== null && (defensa.estado === 'en_curso' || defensa.estado === 'por_revisar');
}

/** La defensa que ocupa la pantalla: la que sigue abierta (la de verdad primero) y, si no, la última. */
export function defensaEnPantalla(estado: EstadoSesionCliente): DefensaCliente | null {
  if (estaViva(estado.defensa)) return estado.defensa;
  if (estaViva(estado.ensayo)) return estado.ensayo;
  return estado.defensa ?? estado.ensayo;
}

export function contextoDeAlcance(estado: EstadoSesionCliente | null, haySesion: boolean, defensa: DefensaCliente | null): ContextoDeAlcance {
  return {
    haySesion,
    hayEntrega: Boolean(estado?.entrega),
    actual: defensa
      ? {
          estado: defensa.estado,
          hayPregunta: defensa.pregunta !== null,
          hayAclaracion: defensa.aclaracion !== null,
          hayRevision: (defensa.revision?.length ?? 0) > 0,
          esEnsayo: defensa.esEnsayo,
        }
      : null,
    defensaEntregada: estado?.defensa?.estado === 'entregada',
  };
}

/** Convierte lo que manda el servidor a lo que dibuja la pantalla de revisión. */
export function bloquesDeRevision(defensa: DefensaCliente | null): BloqueRevision[] {
  return (defensa?.revision ?? []).map((bloque) => ({
    pregunta: { id: bloque.turnoId, numero: bloque.numero, contexto: bloque.contexto, pregunta: bloque.pregunta },
    ...(bloque.lineas
      ? {
          lineas: bloque.lineas.map((linea) => ({
            id: linea.id,
            tiempo: linea.tiempo,
            segmentos: linea.segmentos,
            marcadaDeInicio: linea.marcada,
            aclarada: linea.aclarada,
          })),
        }
      : { porEscrito: bloque.porEscrito ?? '' }),
  }));
}
