import { NextResponse } from 'next/server';

// Define the Lead type to match the form schema, including optional fields
type Lead = {
  name: string;
  email: string;
  phone?: string; // Optional
  company?: string; // Optional
  size?: '1-10' | '11-50' | '51-200' | '200+'; // Optional
  pain?: string; // Optional
};

const leads: Lead[] = []; // In-memory store for leads

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Lead;

    // Basic validation
    if (!body.name || !body.email || !body.email.includes('@')) {
      return NextResponse.json({ error: 'Nombre y correo electrónico válido son requeridos.' }, { status: 400 });
    }

    // Create a new lead object with all fields, respecting optionality
    const newLead: Lead = {
      name: body.name,
      email: body.email,
    };
    if (body.phone) newLead.phone = body.phone;
    if (body.company) newLead.company = body.company;
    if (body.size) newLead.size = body.size;
    if (body.pain) newLead.pain = body.pain;

    leads.push(newLead);
    console.log('[Lead Guardado]', newLead); // Log to server console
    return NextResponse.json({ message: 'Lead guardado exitosamente', lead: newLead }, { status: 201 });

  } catch (error) {
    console.error('[Error API Lead POST]', error);
    // It's good practice to avoid sending detailed internal error messages to the client.
    let errorMessage = 'Error al procesar la solicitud.';
    if (error instanceof SyntaxError) { // Handle JSON parsing errors specifically
        errorMessage = 'Error en el formato de los datos enviados.';
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Protect this route with an admin token (store in .env.local)
  // Example: ADMIN_TOKEN=your_secret_token_here
  if (searchParams.get('secret') !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  return NextResponse.json(leads);
}
