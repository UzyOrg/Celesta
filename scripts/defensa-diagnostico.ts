#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { crearClienteServicio } from '../src/lib/defensa/almacen/supabase';
import { probarProveedores, probarSupabase, revisarConfiguracion, type Comprobacion } from '../src/lib/defensa/diagnostico';
import { crearProveedores } from '../src/lib/defensa/providers';
import type { AudioSintetizado } from '../src/lib/defensa/providers/tipos';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

function imprimir(resultados: Comprobacion[]): void {
  for (const r of resultados) console.log(`[${r.estado.toUpperCase()}] ${r.nombre}: ${r.detalle}`);
  if (resultados.some((r) => r.estado === 'error')) process.exitCode = 1;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let proveedores = false;
  let supabase = false;
  let archivo: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--proveedores') proveedores = true;
    else if (args[i] === '--supabase') supabase = true;
    else if (args[i] === '--audio' && args[i + 1] && !args[i + 1]?.startsWith('--')) archivo = args[++i];
    else {
      console.log('Uso: npm run defensa:diagnostico -- [--supabase] [--proveedores] [--audio muestra.mp3|muestra.wav]');
      console.log('Sin opciones solo valida variables, sin red. --supabase solo lee metadatos.');
      console.log('--proveedores hace llamadas reales, con costo, usando texto ficticio y la muestra indicada o voz sintetizada.');
      if (args[i] !== '--help') process.exitCode = 1;
      return;
    }
  }
  if (archivo && !proveedores) throw new Error('audio_sin_proveedores');
  const configuracion = revisarConfiguracion(process.env);
  imprimir(configuracion);
  if (configuracion.some((r) => r.estado === 'error')) {
    console.log('Completa las variables antes de probar conexiones. Para recorrer la demo: npm run dev:defensa.');
    return;
  }
  if (supabase) imprimir(await probarSupabase(crearClienteServicio()));
  if (proveedores) {
    let audio: AudioSintetizado | undefined;
    if (archivo) {
      const extension = path.extname(archivo).toLowerCase();
      if (!['.mp3', '.wav'].includes(extension)) throw new Error('formato_audio');
      const info = await stat(archivo);
      if (!info.isFile() || info.size < 512 || info.size > 2 * 1024 * 1024) throw new Error('tamano_audio');
      audio = { bytes: new Uint8Array(await readFile(archivo)), mime: extension === '.mp3' ? 'audio/mpeg' : 'audio/wav', extension: extension === '.mp3' ? 'mp3' : 'wav' };
    }
    imprimir(await probarProveedores(crearProveedores(), audio));
  }
  if (!proveedores && !supabase) console.log('Solo se revisó configuración. Las conexiones reales siguen sin probarse.');
  else console.log('No se crearon actividades ni entregas. Esto no comprueba aún la subida firmada ni la escritura de eventos.');
}

main().catch(() => {
  console.error('No se completó el diagnóstico. Revisa las opciones y el audio (MP3/WAV de 512 bytes a 2 MB); no se imprimen datos ni credenciales.');
  process.exitCode = 1;
});
