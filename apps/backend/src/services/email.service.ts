import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,
  auth:
    config.SMTP_USER && config.SMTP_PASS
      ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
      : undefined,
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: config.EMAIL_FROM,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
        .container { max-width: 520px; margin: 40px auto; background: #1e293b; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6, #22d3ee); padding: 32px 40px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px; }
        .body { padding: 32px 40px; }
        .button { display: inline-block; background: #3b82f6; color: white !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; }
        .footer { padding: 20px 40px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; }
        p { line-height: 1.6; margin: 0 0 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>FitCommunity</h1>
          <p>Tu comunidad deportiva</p>
        </div>
        <div class="body">${content}</div>
        <div class="footer">
          Este email fue enviado automáticamente por FitCommunity.<br>
          Si no lo solicitaste, puedes ignorarlo con seguridad.
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendVerificationEmail(
  to: string,
  displayName: string,
  verificationUrl: string
): Promise<void> {
  const html = baseTemplate(`
    <p>Hola <strong>${displayName}</strong>,</p>
    <p>Gracias por registrarte en FitCommunity. Confirma tu dirección de email para activar tu cuenta.</p>
    <div style="text-align:center">
      <a href="${verificationUrl}" class="button">Verificar email</a>
    </div>
    <p style="font-size:13px;color:#94a3b8">
      Este enlace expira en <strong>24 horas</strong>.<br>
      Si el botón no funciona, copia este enlace: ${verificationUrl}
    </p>
  `);
  await sendEmail({ to, subject: 'Verifica tu email · FitCommunity', html });
}

export async function sendPasswordResetEmail(
  to: string,
  displayName: string,
  resetUrl: string
): Promise<void> {
  const html = baseTemplate(`
    <p>Hola <strong>${displayName}</strong>,</p>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
    <div style="text-align:center">
      <a href="${resetUrl}" class="button">Restablecer contraseña</a>
    </div>
    <p style="font-size:13px;color:#94a3b8">
      Este enlace expira en <strong>1 hora</strong>.<br>
      Si no lo solicitaste, ignora este email — tu contraseña no cambiará.
    </p>
  `);
  await sendEmail({ to, subject: 'Restablece tu contraseña · FitCommunity', html });
}

export async function sendWelcomeEmail(to: string, displayName: string): Promise<void> {
  const html = baseTemplate(`
    <p>Bienvenido/a a FitCommunity, <strong>${displayName}</strong>.</p>
    <p>Tu cuenta está activa. Completa tu perfil y empieza a registrar tus entrenamientos.</p>
    <div style="text-align:center">
      <a href="${config.FRONTEND_URL}/onboarding" class="button">Completar perfil</a>
    </div>
  `);
  await sendEmail({ to, subject: 'Bienvenido/a a FitCommunity', html });
}
