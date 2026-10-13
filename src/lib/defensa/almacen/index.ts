import 'server-only';
import { tipoDeAlmacen } from '../config';
import { crearAlmacenMemoria } from './memoria';
import { crearAlmacenSupabase } from './supabase';
import type { AlmacenDefensa } from './tipos';

/**
 * El almacén de este proceso: Supabase salvo que DEFENSA_ALMACEN=memoria fuera de
 * producción. Se crea una vez y se reutiliza entre solicitudes.
 */
const CLAVE = '__celesteaDefensaAlmacen';

export function obtenerAlmacen(): AlmacenDefensa {
  const global = globalThis as unknown as Record<string, { tipo: string; almacen: AlmacenDefensa } | undefined>;
  const tipo = tipoDeAlmacen();
  const guardado = global[CLAVE];
  if (guardado && guardado.tipo === tipo) return guardado.almacen;
  const almacen = tipo === 'memoria' ? crearAlmacenMemoria() : crearAlmacenSupabase();
  global[CLAVE] = { tipo, almacen };
  return almacen;
}

export type { AlmacenDefensa, AlmacenArchivos, RepoDefensa } from './tipos';
