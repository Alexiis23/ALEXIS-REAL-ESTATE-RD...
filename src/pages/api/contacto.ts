import type { APIRoute } from 'astro';
import { Resend } from 'resend';

// Forzamos a Astro a procesar esta API en vivo en el servidor (esencial para SSR en Astro v5+)
export const prerender = false;

// Inicializamos Resend de forma segura con la variable de entorno
// Cambia la inicialización por esta línea defensiva:
const resend = new Resend(import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY);
export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Extraer los datos enviados de forma asíncrona desde el formulario de la web
    const data = await request.formData();
    const nombre = data.get('name')?.toString() || 'Cliente Anónimo';
    const email = data.get('email')?.toString() || '';
    const telefono = data.get('phone')?.toString() || 'No especificado';
    const mensaje = data.get('message')?.toString() || '';

    // Datos dinámicos para identificar qué propiedad está consultando el usuario
    const propiedadTitulo = data.get('property_title')?.toString() || '';
    const propiedadUrl = data.get('property_url')?.toString() || '';
    const tipoFormulario = data.get('form_type')?.toString() || 'Contacto General';

    // 2. Validación básica de seguridad en el servidor
    if (!email) {
      return new Response(JSON.stringify({ error: 'El correo electrónico es requerido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Estructurar el Asunto del correo según el origen del Lead
    const asunto = propiedadTitulo
      ? `🏠 Consulta Inmueble: ${propiedadTitulo} - ${nombre}`
      : `📩 Nuevo Lead: ${tipoFormulario} - ${nombre}`;

    // Plantilla HTML Premium Corporativa (Azul Marino #0B192C + Dorado #C9A84C)
    const htmlTemplate = `
      <div style="background-color: #F8F7F4; padding: 30px; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #0B192C; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(11,25,44,0.15); border: 1px solid rgba(201,168,76,0.25);">
          
          <!-- Encabezado de Marca -->
          <div style="padding: 30px; text-align: center; border-bottom: 1px solid rgba(201,168,76,0.15); background: linear-gradient(135deg, #0B192C 0%, #152740 100%);">
            <h1 style="color: #C9A84C; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">ALEXIS REAL ESTATE RD...</h1>
            <p style="color: #ffffff; margin: 5px 0 0; font-size: 13px; font-weight: 500; opacity: 0.8;">Notificación de Lead desde la Web</p>
          </div>

          <!-- Contenido del Mensaje -->
          <div style="padding: 35px; background-color: #ffffff;">
            <h2 style="color: #0B192C; font-size: 18px; margin-top: 0; border-bottom: 2px solid #C9A84C; padding-bottom: 8px; display: inline-block;">Datos del Interesado</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 120px; font-size: 14px;">Nombre:</td>
                <td style="padding: 8px 0; color: #0B192C; font-weight: bold; font-size: 14px;">${nombre}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600; font-size: 14px;">Correo:</td>
                <td style="padding: 8px 0; color: #0B192C; font-weight: bold; font-size: 14px;"><a href="mailto:${email}" style="color: #C9A84C; text-decoration: none; font-weight: bold;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600; font-size: 14px;">Teléfono:</td>
                <td style="padding: 8px 0; font-size: 14px;"><a href="tel:${telefono}" style="color: #0B192C; text-decoration: none; font-weight: bold;">${telefono}</a></td>
              </tr>
            </table>

            ${propiedadTitulo ? `
              <!-- Ficha del Inmueble Consultada -->
              <div style="background-color: #f8fafc; border-left: 4px solid #C9A84C; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
                <h3 style="margin: 0 0 5px; color: #0B192C; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Inmueble de Interés:</h3>
                <p style="margin: 0; font-size: 15px; font-weight: 700; color: #0B192C;">${propiedadTitulo}</p>
                <p style="margin: 8px 0 0; font-size: 12px;"><a href="${propiedadUrl}" target="_blank" style="color: #C9A84C; text-decoration: underline; font-weight: 600;">Ver propiedad en la web →</a></p>
              </div>
            ` : ''}

            <h3 style="color: #0B192C; font-size: 15px; margin-bottom: 8px; font-weight: bold;">Mensaje del Cliente:</h3>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 10px; font-style: italic; font-size: 13.5px; line-height: 1.6; color: #334155; border: 1px solid #e2e8f0;">
              "${mensaje.replace(/\n/g, '<br>')}"
            </div>
          </div>

          <!-- Pie de Página Seguridad -->
          <div style="background-color: #0B192C; padding: 20px; text-align: center; border-top: 1px solid rgba(201,168,76,0.15);">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mensaje seguro enviado directamente desde el sistema automatizado de alexisRealState.com</p>
            <p style="color: #C9A84C; font-size: 10px; margin: 5px 0 0; font-weight: bold;">© 2026 ALEXIS REAL ESTATE RD... Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    `;

    // 4. Disparar el correo usando el Dominio Corporativo Oficial
    const response = await resend.emails.send({
      from: 'ALEXIS REAL ESTATE RD <consultas@alexisrealstate.com>', // 🌟 REMITENTE CORPORATIVO AUTORIZADO
      to: 'alexisre.rd@gmail.com',                                  // 🌟 DESTINATARIO: Tu papá recibe el lead directo
      replyTo: email,                                               // Permite responderle al cliente dándole al botón "Responder" en Gmail
      subject: asunto,
      html: htmlTemplate,
    });

    if (response.error) {
      console.error("Error devuelto por Resend API:", response.error);
      return new Response(JSON.stringify({ error: response.error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Error crítico en la ejecución del Endpoint:", error);
    return new Response(JSON.stringify({ error: 'Fallo interno de servidor al procesar el lead.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};