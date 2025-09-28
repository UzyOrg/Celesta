#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const WORKSHOPS_DIR = path.join(ROOT, 'public', 'workshops');

/** Deep-scan object for forbidden keys or PII-like patterns */
function checkPII(obj, file, pathPrefix = '') {
  const errors = [];
  const warnings = [];
  const forbiddenKeys = new Set(['email', 'correo', 'telefono', 'tel', 'dni', 'rut', 'cedula']);
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const p = pathPrefix ? `${pathPrefix}.${k}` : k;
      if (forbiddenKeys.has(k.toLowerCase())) {
        errors.push(`${file}: contiene clave prohibida '${p}' (PII)`);
      }
      if (typeof v === 'string' && v.includes('@')) {
        warnings.push(`${file}: posible PII contenido en '${p}' → '${v.slice(0, 40)}...'`);
      }
      if (v && typeof v === 'object') {
        const res = checkPII(v, file, p);
        errors.push(...res.errors);
        warnings.push(...res.warnings);
      }
    }
  }
  return { errors, warnings };
}

async function main() {
  const errors = [];
  const warnings = [];

  // Ensure directory exists
  try {
    await fs.access(WORKSHOPS_DIR);
  } catch {
    console.error('No existe public/workshops/');
    process.exit(1);
  }

  // Load index
  let index = [];
  const indexPath = path.join(WORKSHOPS_DIR, 'index.json');
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    index = JSON.parse(raw);
    if (!Array.isArray(index)) throw new Error('index.json debe ser un arreglo');
  } catch (e) {
    errors.push(`index.json inválido: ${e.message}`);
  }

  // Map expected files
  const expectedFiles = new Set(index.map((x) => `${x.id_taller}.json`));

  // Read all JSON files in dir
  const entries = await fs.readdir(WORKSHOPS_DIR, { withFileTypes: true });
  const jsonFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.json') && e.name !== 'index.json')
    .map((e) => e.name);

  // Check index references exist
  for (const fn of expectedFiles) {
    if (!jsonFiles.includes(fn)) warnings.push(`index.json referencia ${fn} pero el archivo no existe`);
  }

  for (const name of jsonFiles) {
    const file = path.join(WORKSHOPS_DIR, name);
    let data;
    try {
      data = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (e) {
      errors.push(`${name}: JSON inválido (${e.message})`);
      continue;
    }

    // Top-level checks
    if (typeof data.id_taller !== 'string' || data.id_taller.length === 0) {
      errors.push(`${name}: falta id_taller (string)`);
    } else {
      const expected = path.parse(name).name;
      if (data.id_taller !== expected) {
        errors.push(`${name}: id_taller debe coincidir con el nombre de archivo (${expected})`);
      }
    }

    if (typeof data.content_version !== 'string') {
      errors.push(`${name}: falta content_version (string)`);
    }

    if (!Array.isArray(data.pasos) || data.pasos.length === 0) {
      errors.push(`${name}: pasos debe ser un arreglo no vacío`);
      continue;
    }

    const refIds = new Set();
    let lastPaso = 0;
    for (const paso of data.pasos) {
      if (typeof paso.paso_numero !== 'number') {
        errors.push(`${name}: cada paso requiere paso_numero (number)`);
      } else {
        if (paso.paso_numero <= lastPaso) warnings.push(`${name}: paso_numero no está estrictamente ascendente (visto ${paso.paso_numero} después de ${lastPaso})`);
        lastPaso = paso.paso_numero;
      }
      if (typeof paso.ref_id !== 'string' || paso.ref_id.length === 0) {
        errors.push(`${name}: cada paso requiere ref_id (string)`);
      } else if (refIds.has(paso.ref_id)) {
        errors.push(`${name}: ref_id duplicado '${paso.ref_id}'`);
      } else {
        refIds.add(paso.ref_id);
      }
      if (paso.pistas) {
        if (!Array.isArray(paso.pistas)) {
          errors.push(`${name}: pistas debe ser arreglo`);
        } else {
          for (const p of paso.pistas) {
            if (typeof p.id !== 'string' || typeof p.texto !== 'string') {
              errors.push(`${name}: pista inválida en ${paso.ref_id} (id/texto)`);
            }
            if (typeof p.costo !== 'number' || p.costo < 0) warnings.push(`${name}: pista ${paso.ref_id}/${p.id} costo debe ser número >= 0`);
          }
        }
      }
      if (typeof paso.bloquea_avance_si_falla !== 'boolean') warnings.push(`${name}: paso ${paso.ref_id} sin bloquea_avance_si_falla (boolean)`);
      if (typeof paso.puntaje !== 'number') warnings.push(`${name}: paso ${paso.ref_id} sin puntaje (number)`);
      if (paso.validacion && typeof paso.validacion === 'object') {
        if (paso.validacion.tipo === 'palabras_clave') {
          if (!Array.isArray(paso.validacion.criterio) || paso.validacion.criterio.some((x) => typeof x !== 'string')) {
            errors.push(`${name}: validacion.criterio debe ser arreglo de strings en ${paso.ref_id}`);
          }
        }
      }
    }

    // PII check
    const pii = checkPII(data, name);
    errors.push(...pii.errors);
    warnings.push(...pii.warnings);
  }

  // Report
  for (const w of warnings) console.warn('[WARN]', w);
  for (const e of errors) console.error('[ERROR]', e);

  if (errors.length > 0) {
    console.error(`\nLinter: ${errors.length} error(es), ${warnings.length} warning(s).`);
    process.exit(1);
  } else {
    console.log(`Linter: OK. ${warnings.length} warning(s).`);
  }
}

main().catch((e) => {
  console.error('Fallo inesperado en linter:', e);
  process.exit(1);
});
