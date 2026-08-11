import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8_192;
const BetaRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  schoolName: z.string().trim().min(2).max(160),
}).strict();

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character);
}

function jsonResponse(body: object, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`beta-request:${ip}`, 5, 60 * 60 * 1_000);
    if (!rateLimit.allowed) {
      return new NextResponse(JSON.stringify({ error: 'Demasiados intentos. Intenta más tarde.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store',
          'Retry-After': String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1_000))),
        },
      });
    }

    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Solicitud demasiado grande' }, 413);
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Solicitud demasiado grande' }, 413);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Solicitud inválida' }, 400);
    }

    const parsed = BetaRequestSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return jsonResponse({ error: 'Revisa los datos enviados' }, 400);
    }

    const { fullName, email, schoolName } = parsed.data;
    const safeFullName = escapeHtml(fullName);
    const safeEmail = escapeHtml(email);
    const safeSchoolName = escapeHtml(schoolName);
    const encodedEmail = encodeURIComponent(email);

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
                <div class="value">${safeFullName}</div>
              </div>
              <div class="info-row">
                <div class="label">📧 Correo Electrónico</div>
                <div class="value"><a href="mailto:${encodedEmail}" style="color: #667eea;">${safeEmail}</a></div>
              </div>
              <div class="info-row">
                <div class="label">🏫 Institución Educativa</div>
                <div class="value">${safeSchoolName}</div>
              </div>
              <div style="text-align: center;">
                <a href="mailto:${encodedEmail}?subject=Bienvenido%20a%20Celestea%20Beta" class="cta-button">
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
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          message: 'Solicitud registrada (modo desarrollo)',
        });
      }
      
      return jsonResponse({ error: 'Servicio temporalmente no disponible' }, 503);
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
      signal: AbortSignal.timeout(8_000),
    });

    if (!emailResponse.ok) {
      throw new Error('Error al enviar notificación por email');
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada exitosamente',
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return jsonResponse({ error: 'Error al procesar la solicitud' }, 500);
  }
}
