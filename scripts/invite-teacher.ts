#!/usr/bin/env tsx
/**
 * Script de Invitación del Administrador - "Mago de Oz"
 * 
 * Invita a un docente a Celesta OS después de haber preparado su cuenta.
 * Solo puede ser ejecutado localmente por administradores.
 * 
 * Uso:
 *   pnpm run invite:teacher <email@docente.com>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// URL base para redirección (cambiar según el entorno)
const REDIRECT_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function inviteTeacher(email: string): Promise<void> {
  // Validaciones de seguridad
  if (!SUPABASE_URL) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL no está definida en .env.local');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está definida en .env.local');
    console.error('⚠️  Esta clave es CRÍTICA y solo debe usarse en entornos seguros');
    process.exit(1);
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error(`❌ Error: "${email}" no es un email válido`);
    process.exit(1);
  }

  console.log('\n🔐 Inicializando cliente de Supabase con SERVICE_ROLE_KEY...');
  
  // Inicializar cliente con service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`📧 Invitando a: ${email}`);
  console.log(`🔗 Redirect URL: ${REDIRECT_URL}/auth/confirmar-registro\n`);

  try {
    // Llamar a la función admin de Supabase
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${REDIRECT_URL}/auth/confirmar-registro`,
    });

    if (error) {
      console.error('❌ Error al invitar docente:', error.message);
      process.exit(1);
    }

    console.log('✅ ¡Invitación enviada exitosamente!');
    console.log('\n📨 Detalles:');
    console.log(`   - Usuario ID: ${data.user.id}`);
    console.log(`   - Email: ${data.user.email}`);
    console.log(`   - Email confirmado: ${data.user.email_confirmed_at ? '✓' : '✗'}`);
    console.log('\n📬 El docente recibirá un correo con un enlace mágico de un solo uso.');
    console.log('🔒 El enlace lo redirigirá a /auth/confirmar-registro para establecer su contraseña.\n');

  } catch (error) {
    console.error('❌ Excepción inesperada:', error);
    process.exit(1);
  }
}

// Punto de entrada del script
const email = process.argv[2];

if (!email) {
  console.error('\n❌ Error: Debes proporcionar un email');
  console.error('\nUso:');
  console.error('  pnpm run invite:teacher <email@docente.com>\n');
  console.error('Ejemplo:');
  console.error('  pnpm run invite:teacher maria.garcia@universidad.edu\n');
  process.exit(1);
}

inviteTeacher(email);
