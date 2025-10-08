import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface BetaRequestBody {
  fullName: string;
  email: string;
  schoolName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BetaRequestBody = await request.json();
    const { fullName, email, schoolName } = body;

    // Validación básica
    if (!fullName || !email || !schoolName) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Preparar el email de notificación
    const emailContent = {
      to: 'uziel@celestea.ai',
      subject: '🚀 Nueva Solicitud de Acceso a Beta Privada - Celestea',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f7f7f7;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .info-row {
                background: white;
                padding: 15px;
                margin: 10px 0;
                border-radius: 5px;
                border-left: 4px solid #667eea;
              }
              .label {
                font-weight: 600;
                color: #667eea;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .value {
                font-size: 16px;
                margin-top: 5px;
                color: #333;
              }
              .timestamp {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
              }
              .cta-button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 12px 30px;
                border-radius: 5px;
                text-decoration: none;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">🎯 Nueva Solicitud de Beta</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Alguien quiere unirse al piloto de Celestea</p>
            </div>
            <div class="content">
              <div class="info-row">
                <div class="label">👤 Nombre Completo</div>
                <div class="value">${fullName}</div>
              </div>
              <div class="info-row">
                <div class="label">📧 Correo Electrónico</div>
                <div class="value"><a href="mailto:${email}" style="color: #667eea;">${email}</a></div>
              </div>
              <div class="info-row">
                <div class="label">🏫 Institución Educativa</div>
                <div class="value">${schoolName}</div>
              </div>
              <div style="text-align: center;">
                <a href="mailto:${email}?subject=Bienvenido%20a%20Celestea%20Beta" class="cta-button">
                  Responder al Solicitante
                </a>
              </div>
              <div class="timestamp">
                📅 Solicitud recibida: ${new Date().toLocaleString('es-MX', {
                  timeZone: 'America/Mexico_City',
                  dateStyle: 'full',
                  timeStyle: 'long',
                })}
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Nueva Solicitud de Acceso a Beta Privada

Nombre: ${fullName}
Email: ${email}
Institución: ${schoolName}

Solicitud recibida: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}

---
Responde a ${email} para dar acceso al piloto.
      `.trim(),
    };

    // Enviar email usando el servicio de email configurado
    // Por ahora, usaremos Resend (popular en Next.js) o cualquier otro servicio configurado
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL || process.env.RESEND_API_URL;
    const emailApiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;

    if (!emailServiceUrl || !emailApiKey) {
      console.warn('[Beta Request] Email service not configured. Logging request instead:');
      console.log(JSON.stringify({ fullName, email, schoolName, timestamp: new Date().toISOString() }, null, 2));
      
      // En desarrollo, solo logueamos
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          message: 'Solicitud registrada (modo desarrollo)',
        });
      }
      
      return NextResponse.json(
        { error: 'Servicio de email no configurado' },
        { status: 500 }
      );
    }

    // Enviar el email
    const emailResponse = await fetch(emailServiceUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Celestea Beta <onboarding@celestea.ai>',
        to: emailContent.to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('[Beta Request] Email send failed:', errorData);
      
      // Loguear de todas formas para no perder la solicitud
      console.log('[Beta Request] Logged request:', JSON.stringify({ fullName, email, schoolName }, null, 2));
      
      throw new Error('Error al enviar notificación por email');
    }

    console.log(`[Beta Request] ✅ Solicitud enviada: ${email} (${schoolName})`);

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada exitosamente',
    });
  } catch (error) {
    console.error('[Beta Request] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
