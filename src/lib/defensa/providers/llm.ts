import 'server-only';
import { DefensaError } from '../errores';
import { exigirClave, pedir } from './http';
import type { ProveedorLlm, RespuestaJson, SolicitudJson, TareaLlm } from './tipos';

/**
 * Adaptadores del modelo de lenguaje: OpenAI y Anthropic.
 *
 * Los dos piden salida estructurada con el JSON Schema de la tarea. El modelo
 * clasifica o redacta *antes y después* de la defensa; durante ella solo
 * clasifica. Lo que devuelve se valida otra vez en código antes de usarse.
 *
 * No hay modelo por defecto a propósito: un nombre de modelo escrito aquí
 * envejece, y una elección débil se nota sobre todo en el clasificador. Se
 * configura con DEFENSA_LLM_MODEL (plan y reporte) y DEFENSA_LLM_MODEL_CLASIFICADOR.
 */

export interface CredencialesLlm {
  clave: () => string | undefined;
  modelo: (tarea: TareaLlm) => string | undefined;
  fetchFn?: typeof fetch;
}

function modeloPara(solicitud: SolicitudJson, credenciales: CredencialesLlm): string {
  const modelo = solicitud.modelo ?? credenciales.modelo(solicitud.tarea);
  if (!modelo) throw new DefensaError('no_configurado', 503);
  return modelo;
}

function analizarJson(texto: string, proveedor: string): unknown {
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    console.error('defensa_llm_json_invalido', { proveedor });
    throw new DefensaError('proveedor_fallo', 502);
  }
}

interface RespuestaOpenai {
  choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function crearLlmOpenai(credenciales: CredencialesLlm): ProveedorLlm {
  return {
    id: 'openai',
    async generarJson(solicitud): Promise<RespuestaJson> {
      const clave = exigirClave(credenciales.clave());
      const modelo = modeloPara(solicitud, credenciales);
      const respuesta = await pedir(
        'openai',
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelo,
            messages: [
              { role: 'system', content: solicitud.system },
              ...solicitud.mensajes.map((m) => ({ role: m.rol, content: m.contenido })),
            ],
            response_format: {
              type: 'json_schema',
              json_schema: { name: solicitud.esquema.nombre, strict: true, schema: solicitud.esquema.json },
            },
            max_completion_tokens: solicitud.maxTokens,
            // El trabajo de un alumno no se guarda del lado del proveedor.
            store: false,
          }),
        },
        solicitud.timeoutMs,
        credenciales.fetchFn,
      );
      const datos = (await respuesta.json()) as RespuestaOpenai;
      const mensaje = datos.choices?.[0]?.message;
      if (!mensaje?.content || mensaje.refusal) {
        console.error('defensa_llm_sin_contenido', { proveedor: 'openai', rechazo: Boolean(mensaje?.refusal) });
        throw new DefensaError('proveedor_fallo', 502);
      }
      const uso = datos.usage ? { entrada: datos.usage.prompt_tokens ?? 0, salida: datos.usage.completion_tokens ?? 0 } : undefined;
      return { json: analizarJson(mensaje.content, 'openai'), proveedor: 'openai', modelo, ...(uso ? { uso } : {}) };
    },
  };
}

interface RespuestaAnthropic {
  content?: Array<{ type: string; input?: unknown }>;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
}

export function crearLlmAnthropic(credenciales: CredencialesLlm): ProveedorLlm {
  return {
    id: 'anthropic',
    async generarJson(solicitud): Promise<RespuestaJson> {
      const clave = exigirClave(credenciales.clave());
      const modelo = modeloPara(solicitud, credenciales);
      const respuesta = await pedir(
        'anthropic',
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'x-api-key': clave,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelo,
            max_tokens: solicitud.maxTokens,
            system: solicitud.system,
            messages: solicitud.mensajes.map((m) => ({ role: m.rol, content: m.contenido })),
            // La salida estructurada se pide como una herramienta de uso obligatorio.
            tools: [
              {
                name: solicitud.esquema.nombre,
                description: 'Entrega el resultado con exactamente la forma indicada.',
                input_schema: solicitud.esquema.json,
              },
            ],
            tool_choice: { type: 'tool', name: solicitud.esquema.nombre },
          }),
        },
        solicitud.timeoutMs,
        credenciales.fetchFn,
      );
      const datos = (await respuesta.json()) as RespuestaAnthropic;
      const bloque = datos.content?.find((parte) => parte.type === 'tool_use');
      if (!bloque || bloque.input === undefined || bloque.input === null) {
        console.error('defensa_llm_sin_contenido', { proveedor: 'anthropic' });
        throw new DefensaError('proveedor_fallo', 502);
      }
      const u = datos.usage;
      const uso = u
        ? { entrada: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), salida: u.output_tokens ?? 0 }
        : undefined;
      return { json: bloque.input, proveedor: 'anthropic', modelo, ...(uso ? { uso } : {}) };
    },
  };
}
