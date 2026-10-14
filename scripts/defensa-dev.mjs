#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

// Un arranque local explícito: nunca usa las llaves reales que pueda haber en .env.local.
const args = process.argv.slice(2);
const port = args.length === 0 ? 3000 : args.length === 2 && args[0] === '--port' ? Number(args[1]) : NaN;
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Uso: npm run dev:defensa -- --port 3000');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  console.error('La demo en memoria solo se ejecuta en desarrollo local.');
  process.exit(1);
}

const origin = `http://127.0.0.1:${port}`;
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    NEXT_DIST_DIR: '.next',
    NEXT_PUBLIC_SITE_URL: origin,
    // El layout compartido inicializa un cliente Supabase incluso en /defensa.
    // Estos valores ficticios satisfacen esa inicialización sin apuntar a una base real.
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'defensa-demo-anon-placeholder',
    SUPABASE_SERVICE_ROLE_KEY: 'defensa-demo-service-placeholder',
    DEFENSA_ALMACEN: 'memoria',
    DEFENSA_SIGNING_SECRET: randomBytes(48).toString('base64url'),
    CRON_SECRET: randomBytes(24).toString('base64url'),
    DEFENSA_PUBLICA: '0',
    DEFENSA_LLM_PROVIDER: 'mock',
    DEFENSA_STT_PROVIDER: 'mock',
    DEFENSA_TTS_PROVIDER: 'mock',
  },
});
console.log(`Demo local: ${origin}/defensa/demo-celestea`);
console.log('Datos y proveedores simulados. Al reiniciar se pierden las sesiones y las entregas.');
child.on('error', () => { console.error('No se pudo arrancar Next. Instala las dependencias primero.'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
