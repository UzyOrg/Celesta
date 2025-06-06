import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // <--- AÑADIR ESTA IMPORTACIÓN

// Define the Lead type to match the form schema, including optional fields
type Lead = {
  name: string;
  email: string;
  phone?: string; // Optional
  company?: string; // Optional
  size?: '1-10' | '11-50' | '51-200' | '200+'; // Optional
  pain?: string; // Optional
};

// Configuración de Supabase (deberían estar en .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Crear cliente de Supabase para el backend
// Asegurarse de que las variables de entorno están definidas
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Supabase URL or Service Role Key is not defined in environment variables for /api/lead");
  // No podemos crear el cliente si falta la configuración, esto causará un error en tiempo de ejecución si se llama a la API.
  // En un escenario real, podrías tener un manejo más robusto aquí o al inicio de la aplicación.
}
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!); // El ! asume que están definidas


export async function POST(req: Request) {
  // Verificar configuración de Supabase al inicio de la función
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 });
  }

  try {
    const body = (await req.json()) as Lead;

    // Basic validation
    if (!body.name || !body.email || !body.email.includes('@')) {
      return NextResponse.json({ error: 'Nombre y correo electrónico válido son requeridos.' }, { status: 400 });
    }

    // 1. Verificar si el email ya existe
    console.log(`[API /api/lead] Checking if email exists: ${body.email}`);
    const { data: existingLeads, error: selectError } = await supabaseAdmin
      .from('Leads')
      .select('email') // Solo necesitamos saber si existe, podemos seleccionar solo el email o id
      .eq('email', body.email)
      .limit(1); // Solo necesitamos un resultado para confirmar existencia

    if (selectError) {
      console.error('[API /api/lead] Supabase select error (checking email):', selectError);
      return NextResponse.json({ error: 'Error al verificar el correo en la base de datos.', details: selectError.message }, { status: 500 });
    }

    if (existingLeads && existingLeads.length > 0) {
      console.log(`[API /api/lead] Email ${body.email} already registered.`);
      return NextResponse.json({ 
        message: 'Este correo electrónico ya está registrado en nuestra lista de espera.',
        emailExists: true // Un flag para que el frontend lo identifique fácilmente
      }, { status: 409 }); // 409 Conflict es un buen código para esto
    }

    // 2. Si no existe, proceder con la inserción
    const leadDataToInsert = {
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      company: body.company || null,
      size: body.size || null,
      pain: body.pain || null,
      // created_at se llenará automáticamente por Supabase si tiene DEFAULT now()
    };

    console.log('[API /api/lead] Attempting to insert new lead into Supabase:', leadDataToInsert);
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('Leads') // Nombre exacto de tu tabla en Supabase
      .insert([leadDataToInsert])
      .select(); // Opcional: .select() para obtener el registro insertado

    if (insertError) {
      console.error('[API /api/lead] Supabase insert error:', insertError);
      return NextResponse.json({ 
        error: 'Error al guardar el lead en la base de datos.', 
        details: insertError.message 
      }, { status: 500 });
    }

    console.log('[API /api/lead] Lead guardado exitosamente en Supabase:', insertedData);
    // Devolvemos el primer elemento del array 'data' si existe, o un mensaje genérico.
    const insertedLead = insertedData && insertedData.length > 0 ? insertedData[0] : null;
    return NextResponse.json({ message: 'Lead guardado exitosamente', lead: insertedLead, emailExists: false }, { status: 201 });

  } catch (error) {
    console.error('[API /api/lead] Error procesando la solicitud:', error);
    let errorMessage = 'Error al procesar la solicitud.';
    if (error instanceof SyntaxError) {
      errorMessage = 'Error en el formato de los datos enviados.';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    // Asegurarse de que 'error' tenga una propiedad 'message', o castear a 'any' o 'Error'
    const err = error as Error; // O any
    return NextResponse.json({ error: errorMessage, details: err.message }, { status: 500 });
  }
}

// La función GET puede permanecer igual si aún la necesitas para los leads en memoria (o adaptarla a Supabase)
export async function GET(req: Request) {
  // ... (tu código GET actual) ...
  // Si quieres que GET también lea de Supabase, necesitarías implementar esa lógica aquí,
  // posiblemente usando supabaseAdmin y protegiéndolo adecuadamente.
  // Por ahora, lo dejamos como está para no modificar su funcionalidad actual.
  const { searchParams } = new URL(req.url);
  if (searchParams.get('secret') !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  // Esto devolverá el array 'leads' en memoria, no los de Supabase.
  // Considera si esta funcionalidad aún es necesaria o si debe ser eliminada/adaptada.
  const leads: Lead[] = []; // Esto reiniciará el array en cada llamada a GET si se deja aquí.
                           // Debería estar fuera si quieres persistencia en memoria entre llamadas a GET.
                           // Pero dado que POST ahora va a Supabase, la utilidad de este GET en memoria es limitada.
  return NextResponse.json({ message: "Esta ruta GET actualmente no devuelve leads de Supabase.", inMemoryLeads: leads});
}

