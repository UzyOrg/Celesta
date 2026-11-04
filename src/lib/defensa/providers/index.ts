import 'server-only';
import { config } from '../config';
import { crearLlmAnthropic, crearLlmOpenai } from './llm';
import { crearLlmMock, crearSttMock, crearTtsMock } from './mock';
import { crearSttAssemblyai, crearSttDeepgram, crearSttElevenlabs } from './stt';
import type { Proveedores, ProveedorLlm, ProveedorStt, ProveedorTts, TareaLlm } from './tipos';
import { crearTtsElevenlabs } from './tts';

/**
 * Elige los proveedores según las variables de entorno:
 *
 *   DEFENSA_LLM_PROVIDER   openai | anthropic | mock
 *   DEFENSA_STT_PROVIDER   deepgram | assemblyai | elevenlabs | mock
 *   DEFENSA_TTS_PROVIDER   elevenlabs | mock
 *
 * Cambiar de proveedor es cambiar una variable; los servicios solo conocen las
 * interfaces de providers/tipos.ts. Las llaves y el modelo se leen en cada
 * llamada, nunca se guardan en una constante.
 */
/** El clasificador y el asistente del profesor usan modelos rápidos; el plan y el reporte, el principal. */
function modeloParaTarea(tarea: TareaLlm): string | undefined {
  if (tarea === 'asistente') return config.modeloAsistente();
  return tarea === 'clasificar_turno' ? config.modeloClasificador() : config.modeloPlan();
}

export function crearLlm(): ProveedorLlm {
  switch (config.proveedorLlm()) {
    case 'openai':
      return crearLlmOpenai({ clave: config.claveOpenai, modelo: modeloParaTarea });
    case 'anthropic':
      return crearLlmAnthropic({ clave: config.claveAnthropic, modelo: modeloParaTarea });
    default:
      return crearLlmMock();
  }
}

export function crearStt(): ProveedorStt {
  switch (config.proveedorStt()) {
    case 'deepgram':
      return crearSttDeepgram({ clave: config.claveDeepgram, modelo: config.modeloStt });
    case 'assemblyai':
      return crearSttAssemblyai({ clave: config.claveAssemblyai, modelo: config.modeloStt });
    case 'elevenlabs':
      return crearSttElevenlabs({
        clave: config.claveElevenlabs,
        modelo: config.modeloStt,
        sinRegistro: () => process.env.DEFENSA_ELEVENLABS_SIN_REGISTRO === '1',
      });
    default:
      return crearSttMock(() => process.env.DEFENSA_MOCK_STT_TEXTO?.trim() || undefined);
  }
}

export function crearTts(): ProveedorTts {
  switch (config.proveedorTts()) {
    case 'elevenlabs':
      return crearTtsElevenlabs({
        clave: config.claveElevenlabs,
        voz: config.vozElevenlabs,
        modelo: config.modeloElevenlabs,
        sinRegistro: () => process.env.DEFENSA_ELEVENLABS_SIN_REGISTRO === '1',
      });
    default:
      return crearTtsMock();
  }
}

export function crearProveedores(): Proveedores {
  return { llm: crearLlm(), stt: crearStt(), tts: crearTts() };
}

export type { Proveedores, ProveedorLlm, ProveedorStt, ProveedorTts } from './tipos';
