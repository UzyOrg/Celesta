import 'server-only';

/**
 * Errores que el servidor sabe explicar. El código es estable (lo lee el
 * cliente); el mensaje es una frase en español que se puede mostrar tal cual.
 * Nunca llevan datos del trabajo ni del alumno.
 */
export type CodigoError =
  | 'no_configurado'
  | 'no_autorizado'
  | 'no_encontrado'
  | 'solicitud_invalida'
  | 'demasiado_grande'
  | 'demasiadas_solicitudes'
  | 'enlace_inactivo'
  | 'limite_envios'
  | 'formato_no_aceptado'
  | 'archivo_no_llego'
  | 'sin_texto'
  | 'trabajo_corto'
  | 'plan_no_listo'
  | 'sin_entrega'
  | 'estado_invalido'
  | 'partes_faltantes'
  | 'transcripcion_fallo'
  | 'consentimiento_requerido'
  | 'ocupado'
  | 'proveedor_fallo';

const MENSAJES: Readonly<Record<CodigoError, string>> = {
  no_configurado: 'El servicio no está configurado.',
  no_autorizado: 'Este enlace ya no sirve. Pide uno nuevo.',
  no_encontrado: 'No encontramos lo que buscas.',
  solicitud_invalida: 'Falta algo o no se entendió la solicitud.',
  demasiado_grande: 'Es demasiado grande.',
  demasiadas_solicitudes: 'Van muchas solicitudes seguidas. Espera un momento.',
  enlace_inactivo: 'Este enlace está desactivado. Pregúntale a tu profe.',
  limite_envios: 'Este enlace ya llegó a su límite de envíos. Avísale a tu profe.',
  formato_no_aceptado: 'Solo PDF, Word (.docx) o texto pegado.',
  archivo_no_llego: 'El archivo no llegó completo. Inténtalo otra vez.',
  sin_texto: 'No pudimos leer texto en ese archivo. Sube otro o pega el texto.',
  trabajo_corto: 'El trabajo es muy corto para armar las preguntas. Sube la versión completa.',
  plan_no_listo: 'Tus preguntas todavía no están listas.',
  sin_entrega: 'Primero sube tu trabajo.',
  estado_invalido: 'Eso ya no se puede hacer en este momento.',
  partes_faltantes: 'Faltan partes del audio. Se están enviando.',
  transcripcion_fallo: 'No pudimos procesar el audio. Puedes escribir tu respuesta.',
  consentimiento_requerido: 'Hay que aceptar las tres confirmaciones para seguir.',
  ocupado: 'Estamos procesando tu respuesta. Un momento.',
  proveedor_fallo: 'Algo falló de nuestro lado. Inténtalo otra vez.',
};

export class DefensaError extends Error {
  readonly codigo: CodigoError;
  readonly status: number;
  /** Datos extra y seguros para el cliente (por ejemplo, las partes que faltan). */
  readonly detalle?: Record<string, unknown>;

  constructor(codigo: CodigoError, status: number, detalle?: Record<string, unknown>) {
    super(MENSAJES[codigo]);
    this.name = 'DefensaError';
    this.codigo = codigo;
    this.status = status;
    this.detalle = detalle;
  }
}

export const noAutorizado = () => new DefensaError('no_autorizado', 401);
export const noEncontrado = () => new DefensaError('no_encontrado', 404);
export const solicitudInvalida = () => new DefensaError('solicitud_invalida', 400);
export const estadoInvalido = () => new DefensaError('estado_invalido', 409);
