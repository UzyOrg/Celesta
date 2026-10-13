#!/usr/bin/env tsx
/**
 * Alta y control de actividades de defensa oral (etapa 1 del piloto: Hi configura cada
 * actividad a mano con la consigna y la rúbrica que manda el profesor).
 *
 * Uso (desde la raíz del repo, con .env.local lleno):
 *
 *   pnpm defensa:actividad crear actividad.json            crea la actividad y da los dos enlaces
 *   pnpm defensa:actividad crear actividad.json --simular  valida el archivo sin tocar la base
 *   pnpm defensa:actividad enlace <código|id> [--dias 90]  enlace nuevo del profesor (los anteriores siguen sirviendo)
 *   pnpm defensa:actividad rotar <código|id>               invalida TODOS los enlaces del profesor y da uno nuevo
 *   pnpm defensa:actividad desactivar <código|id>          el enlace del grupo deja de dejar entrar y entregar
 *   pnpm defensa:actividad activar <código|id>
 *   pnpm defensa:actividad estado <código|id>              envíos usados, límite y si el enlace está activo
 *
 * <código> es lo que va tras /defensa/ en el enlace del grupo.
 *
 * Ejemplo de actividad.json:
 *
 *   {
 *     "nombre": "Encuesta sobre hábitos de estudio",
 *     "curso": "Metodología de la investigación",
 *     "grupo": "3B",
 *     "profesor": "Laura Méndez",
 *     "consigna": "Diseña y aplica una encuesta ... (pegada tal cual)",
 *     "rubrica": "Criterio 1 ... (opcional, pegada tal cual)",
 *     "ejemplosDocente": "Preguntas o criterios de ejemplo del profesor (opcional)",
 *     "registro": "tu",
 *     "duracion": "corta",
 *     "fechaLimite": "2026-10-23T23:59:00-06:00",
 *     "limiteEnvios": 60,
 *     "objetivos": [
 *       { "texto": "Justifica por qué eligió una encuesta" },
 *       { "texto": "Explica cómo definió su muestra", "corto": "Explica su muestra" }
 *     ]
 *   }
 *
 * Máximo tres objetivos. "corto", "alias" y "tema" son opcionales: apodos que usa la
 * pantalla del profesor; el modelo solo ve el texto de cada objetivo.
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { crearClienteServicio, crearRepoSupabase } from '../src/lib/defensa/almacen/supabase';
import type { ActividadRow, RepoDefensa } from '../src/lib/defensa/almacen/tipos';
import { LIMITES, config } from '../src/lib/defensa/config';
import { emitirAccesoProfesor, generarTokenGrupo } from '../src/lib/defensa/firmas';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const UN_DIA_MS = 24 * 60 * 60 * 1000;

const Actividad = z
  .object({
    nombre: z.string().trim().min(1).max(200),
    curso: z.string().trim().max(200).default(''),
    grupo: z.string().trim().max(60).default(''),
    profesor: z.string().trim().min(1).max(200),
    profesorRef: z.string().trim().max(120).optional(),
    consigna: z.string().trim().min(1).max(20_000),
    rubrica: z.string().trim().max(20_000).optional(),
    ejemplosDocente: z.string().trim().max(20_000).optional(),
    contextoCurso: z.string().trim().max(2_000).optional(),
    registro: z.enum(['tu', 'usted']).default('tu'),
    duracion: z.enum(['corta', 'larga']).default('corta'),
    fechaLimite: z.string().refine((valor) => !Number.isNaN(Date.parse(valor)), 'fechaLimite debe ser una fecha, por ejemplo 2026-10-23T23:59:00-06:00'),
    limiteEnvios: z.number().int().min(1).max(5_000).default(120),
    objetivos: z
      .array(
        z
          .object({
            texto: z.string().trim().min(1).max(300),
            corto: z.string().trim().max(60).optional(),
            alias: z.string().trim().max(60).optional(),
            tema: z.string().trim().max(80).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(3),
  })
  .strict();

function salir(mensaje: string): never {
  console.error(`\nError: ${mensaje}\n`);
  process.exit(1);
}

function bandera(args: string[], nombre: string): string | null {
  const i = args.indexOf(nombre);
  return i >= 0 ? (args[i + 1] ?? '') : null;
}

function enlaceCompleto(ruta: string): string {
  const sitio = config.urlSitio();
  return sitio ? `${sitio.replace(/\/$/, '')}${ruta}` : ruta;
}

async function buscar(repo: RepoDefensa, codigoOId: string): Promise<ActividadRow> {
  const porCodigo = await repo.actividadPorTokenGrupo(codigoOId.trim().toLowerCase());
  if (porCodigo) return porCodigo;
  if (/^[0-9a-f-]{36}$/i.test(codigoOId)) {
    const porId = await repo.actividadPorId(codigoOId.toLowerCase());
    if (porId) return porId;
  }
  return salir(`No encontré ninguna actividad con el código o id "${codigoOId}".`);
}

function imprimirEnlaces(actividad: ActividadRow, token: string, expiraEn: number): void {
  console.log('\n  Enlace para el GRUPO (se comparte con los alumnos):');
  console.log(`    ${enlaceCompleto(`/defensa/${actividad.tokenGrupo}`)}`);
  console.log('\n  Enlace del PROFESOR (es una llave: solo para quien revisa, no se reparte al grupo):');
  console.log(`    ${enlaceCompleto(`/revision/${token}`)}`);
  console.log(`    vale hasta el ${new Date(expiraEn).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`);
  if (!config.urlSitio()) {
    console.log('\n  (Define NEXT_PUBLIC_SITE_URL en .env.local para que los enlaces salgan completos.)');
  }
  console.log('');
}

async function crear(args: string[]): Promise<void> {
  const archivo = args[0];
  if (!archivo) salir('Falta el archivo: pnpm defensa:actividad crear actividad.json');
  let crudo: unknown;
  try {
    crudo = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), archivo), 'utf8')) as unknown;
  } catch (error) {
    return salir(`No pude leer ${archivo} como JSON: ${error instanceof Error ? error.message : 'error desconocido'}`);
  }
  const valida = Actividad.safeParse(crudo);
  if (!valida.success) {
    return salir(valida.error.issues.map((i) => `${i.path.join('.') || '(archivo)'}: ${i.message}`).join('\n  '));
  }
  const datos = valida.data;

  const objetivos = datos.objetivos.map((o, i) => ({
    id: `O${i + 1}`,
    text: o.texto,
    ...(o.corto ? { corto: o.corto } : {}),
    ...(o.alias ? { alias: o.alias } : {}),
    ...(o.tema ? { tema: o.tema } : {}),
  }));

  if (args.includes('--simular')) {
    console.log('\n  El archivo es válido. Se crearía:');
    console.log(`    ${datos.nombre} · ${datos.curso} ${datos.grupo} · ${objetivos.length} objetivo(s) · ${datos.duracion} · cierra ${new Date(datos.fechaLimite).toISOString()}`);
    console.log(`    límite de ${datos.limiteEnvios} envíos, registro "${datos.registro}"\n`);
    return;
  }

  const repo = crearRepoSupabase(crearClienteServicio());
  const actividad = await repo.crearActividad({
    tokenGrupo: generarTokenGrupo(),
    nombre: datos.nombre,
    curso: datos.curso,
    grupo: datos.grupo,
    profesorNombre: datos.profesor,
    profesorRef: datos.profesorRef ?? null,
    consigna: datos.consigna,
    rubrica: datos.rubrica ?? null,
    ejemplosDocente: datos.ejemplosDocente ?? null,
    contextoCurso: datos.contextoCurso ?? null,
    registro: datos.registro,
    objetivos,
    duracion: datos.duracion,
    fechaLimite: new Date(datos.fechaLimite).toISOString(),
    limiteEnvios: datos.limiteEnvios,
    enlaceActivo: true,
  });
  const { token, expiraEn } = emitirAccesoProfesor(actividad.id, actividad.accesoVersion);
  console.log(`\n  Actividad creada (${actividad.id}).`);
  imprimirEnlaces(actividad, token, expiraEn);
}

async function enlace(args: string[]): Promise<void> {
  const repo = crearRepoSupabase(crearClienteServicio());
  const actividad = await buscar(repo, args[0] ?? salir('Falta el código o el id de la actividad.'));
  const dias = Number(bandera(args, '--dias') ?? NaN);
  const duracionMs = Number.isFinite(dias) && dias > 0 ? Math.min(dias, 365) * UN_DIA_MS : LIMITES.accesoProfesorMs;
  const { token, expiraEn } = emitirAccesoProfesor(actividad.id, actividad.accesoVersion, { duracionMs });
  imprimirEnlaces(actividad, token, expiraEn);
}

async function rotar(args: string[]): Promise<void> {
  const repo = crearRepoSupabase(crearClienteServicio());
  const actividad = await buscar(repo, args[0] ?? salir('Falta el código o el id de la actividad.'));
  const nueva = await repo.actualizarActividad(actividad.id, { accesoVersion: actividad.accesoVersion + 1 });
  console.log(`\n  Se invalidaron todos los enlaces del profesor anteriores (versión de acceso ${nueva.accesoVersion}).`);
  const { token, expiraEn } = emitirAccesoProfesor(nueva.id, nueva.accesoVersion);
  imprimirEnlaces(nueva, token, expiraEn);
}

async function cambiarEnlaceDelGrupo(args: string[], activo: boolean): Promise<void> {
  const repo = crearRepoSupabase(crearClienteServicio());
  const actividad = await buscar(repo, args[0] ?? salir('Falta el código o el id de la actividad.'));
  await repo.actualizarActividad(actividad.id, { enlaceActivo: activo });
  console.log(
    activo
      ? '\n  El enlace del grupo está activo otra vez.\n'
      : '\n  El enlace del grupo quedó desactivado: nadie nuevo entra ni entrega. Quien ya estaba defendiendo puede terminar.\n',
  );
}

async function estado(args: string[]): Promise<void> {
  const repo = crearRepoSupabase(crearClienteServicio());
  const actividad = await buscar(repo, args[0] ?? salir('Falta el código o el id de la actividad.'));
  console.log(`\n  ${actividad.nombre} (${actividad.curso} ${actividad.grupo})`);
  console.log(`  Enlace del grupo: ${actividad.enlaceActivo ? 'activo' : 'DESACTIVADO'}`);
  console.log(`  Envíos: ${actividad.enviosUsados} de ${actividad.limiteEnvios}`);
  console.log(`  Cierra: ${new Date(actividad.fechaLimite).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`);
  console.log(`  Versión de acceso del profesor: ${actividad.accesoVersion}\n`);
}

async function main(): Promise<void> {
  const [comando, ...args] = process.argv.slice(2);
  switch (comando) {
    case 'crear':
      return crear(args);
    case 'enlace':
      return enlace(args);
    case 'rotar':
      return rotar(args);
    case 'desactivar':
      return cambiarEnlaceDelGrupo(args, false);
    case 'activar':
      return cambiarEnlaceDelGrupo(args, true);
    case 'estado':
      return estado(args);
    default:
      console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]?.replace(/^#!.*\n/, '').replace(/^\/\*\*\n?/, '').replace(/^ \* ?/gm, '') ?? '');
  }
}

main().catch((error: unknown) => {
  // Nunca se imprime el mensaje completo de un error de base: podría traer datos.
  console.error(`\nError: ${error instanceof Error ? error.name : 'desconocido'}. Revisa .env.local (URL y llave de Supabase) y que la migración esté aplicada.\n`);
  process.exit(1);
});
