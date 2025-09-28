import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Asegúrate de que estas variables de entorno estén configuradas en tu .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // En un entorno de producción, querrías manejar esto de forma más robusta
  // y no exponer detalles de la clave en los logs si es posible.
  console.error("Supabase URL or Service Role Key is not defined in environment variables.");
  // Devolver un error genérico al cliente
  // Esta verificación se hace a nivel de módulo, por lo que si falla aquí, la ruta no se cargará.
  // Para manejarlo dentro de la función POST, la lógica debería estar allí.
}

// Crear un cliente de Supabase específico para operaciones de servicio (backend)
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!); // El ! asume que están definidas debido a la verificación anterior o confianza.

export async function POST() {
  // Re-verificar aquí por si acaso, o confiar en la carga del módulo
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ success: false, message: 'Server configuration error (checked in POST).' }, { status: 500 });
  }

  try {
    const leadName = 'Test Lead from API';
    const leadEmail = `test-${Date.now()}@example.com`;
    const leadPhone = '123-456-7890'; // Opcional, puedes omitirlo o poner null

    const testLeadData = {
      name: leadName,
      email: leadEmail,
      phone: leadPhone, // Incluimos el teléfono, pero podría ser null o no estar si es opcional
      // company, size, pain se omitirán y deberían aceptar NULL o tener valores DEFAULT en la DB
    };

    console.log('Attempting to insert lead:', testLeadData);

    const { data, error, status, statusText } = await supabaseAdmin
      .from('Leads') // Nombre exacto de tu tabla
      .insert([testLeadData])
      .select(); // .select() para obtener el registro insertado

    if (error) {
      console.error('Supabase insert error:', { error, status, statusText });
      return NextResponse.json({ 
        success: false, 
        message: 'Error inserting lead.', 
        error: error.message,
        details: { status, statusText, code: error.code, hint: error.hint }
      }, { status: 500 });
    }

    console.log('Supabase insert success:', data);
    return NextResponse.json({ success: true, message: 'Lead inserted successfully!', data }, { status: 200 });
  } catch (e: any) {
    console.error('API route error:', e);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred in API route.', error: e.message }, { status: 500 });
  }
}
