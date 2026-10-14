import 'server-only';
import { config, tipoDeAlmacen } from '../config';
import { emitirAccesoProfesor } from '../firmas';
import { crearAlmacenMemoria } from './memoria';
import { sembrarActividadDemo, TOKEN_GRUPO_DEMO } from './semilla';
import { crearAlmacenSupabase } from './supabase';
import type { AlmacenDefensa } from './tipos';

/**
 * El almacén de este proceso: Supabase salvo que DEFENSA_ALMACEN=memoria fuera de
 * producción. Se crea una vez y se reutiliza entre solicitudes.
 *
 * El almacén en memoria arranca con una actividad de demostración y, en la consola del
 * servidor, imprime los dos enlaces para recorrerla (si hay secreto de firma).
 */
const CLAVE = '__celesteaDefensaAlmacen';

function anunciarDemo(actividadId: string, accesoVersion: number): void {
  const sitio = config.urlSitio() ?? 'http://localhost:3000';
  console.info(`[defensa] Almacén en memoria con actividad de demostración. Alumno: ${sitio}/defensa/${TOKEN_GRUPO_DEMO}`);
  if ((config.secretoFirma()?.length ?? 0) < 32) {
    console.info('[defensa] DEFENSA_SIGNING_SECRET requiere al menos 32 caracteres. Para la demo sin configuración usa npm run dev:defensa.');
    return;
  }
  const { token } = emitirAccesoProfesor(actividadId, accesoVersion, { duracionMs: 7 * 24 * 60 * 60 * 1000 });
  console.info(`[defensa] Profesor (vale 7 días): ${sitio}/revision/${token}`);
}

export function obtenerAlmacen(): AlmacenDefensa {
  const global = globalThis as unknown as Record<string, { tipo: string; almacen: AlmacenDefensa } | undefined>;
  const tipo = tipoDeAlmacen();
  const guardado = global[CLAVE];
  if (guardado && guardado.tipo === tipo) return guardado.almacen;

  let almacen: AlmacenDefensa;
  if (tipo === 'memoria') {
    const enMemoria = crearAlmacenMemoria();
    const actividad = sembrarActividadDemo(enMemoria.estado);
    almacen = enMemoria;
    anunciarDemo(actividad.id, actividad.accesoVersion);
  } else {
    almacen = crearAlmacenSupabase();
  }
  global[CLAVE] = { tipo, almacen };
  return almacen;
}

export type { AlmacenDefensa, AlmacenArchivos, RepoDefensa } from './tipos';
