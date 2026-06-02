import { addDoc, collection } from 'firebase/firestore';
import { db } from './config';
import { getSettings } from './dbService';


/**
 * emailService.js
 * Escribe documentos en la colección "mail" de Firestore.
 * La extensión "Trigger Email from Firestore" los detecta
 * y los envía como correos reales automáticamente.
 *
 * Todas las funciones aceptan UN ARRAY de horas para enviar UN solo correo
 * por bloque reservado (ej: [14, 15, 16] → "14:00 — 17:00").
 */

// ─── Helpers de formato ───────────────────────────────────────────────────────

/** Formatea "2026-04-15" como "Martes 15 de Abril 2026" */
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Formatea número de hora como "19:00 — 20:00 hrs" */
function formatHour(startTime) {
  const h = String(startTime).padStart(2, '0');
  const h2 = String(startTime + 1).padStart(2, '0');
  return `${h}:00 — ${h2}:00`;
}

/**
 * Genera el HTML de la lista de horas.
 * Si son consecutivas, muestra el rango; si no, lista cada una.
 */
function formatHoursList(hours) {
  const sorted = [...hours].sort((a, b) => a - b);

  if (sorted.length === 1) {
    return `<p style="margin: 0;"><strong>Hora:</strong> ${formatHour(sorted[0])}</p>`;
  }

  // Mostrar rango general + lista detallada
  const first = sorted[0];
  const last = sorted[sorted.length - 1] + 1;
  const range = `${String(first).padStart(2, '0')}:00 — ${String(last).padStart(2, '0')}:00 (${sorted.length}h)`;

  const items = sorted.map(h =>
    `<span style="display:inline-block; padding:4px 12px; background:#21262d; border-radius:16px; margin:2px; font-size:0.85em;">${formatHour(h)}</span>`
  ).join(' ');

  return `
    <p style="margin: 0 0 8px 0;"><strong>Bloque:</strong> ${range}</p>
    <div style="margin-top: 8px;">${items}</div>
  `;
}

// ─── Plantilla base HTML ──────────────────────────────────────────────────────
function baseTemplate(content) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c6afa, #5b4df0); padding: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Sala de Ensayo</h1>
      </div>
      <div style="padding: 32px;">
        ${content}
      </div>
      <div style="padding: 16px 32px; text-align: center; color: #484f58; font-size: 12px; border-top: 1px solid #21262d;">
        Este es un correo automático. No respondas a este mensaje.
      </div>
    </div>
  `;
}

/** Genera el botón de WhatsApp reutilizable */
function whatsappButton(text = 'Consultas por WhatsApp') {
  return `
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://wa.me/56968194161"
         style="background: #25D366; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
        ${text}
      </a>
    </div>
  `;
}

/** Formatea número como moneda CLP: 8000 → "$8.000" */
function formatCLP(amount) {
  return '$' + amount.toLocaleString('es-CL');
}

// ─── Correo 1: Reserva Confirmada ────────────────────────────────────────────
/**
 * UN correo con todas las horas confirmadas.
 * @param {number|number[]} startTime - Hora única o array de horas [14, 15, 16]
 */
export async function sendConfirmationEmail({ to, userName, date, startTime }) {
  const hours = Array.isArray(startTime) ? startTime : [startTime];
  const dateLabel = formatDate(date);

  const settings = await getSettings();
  const intro = settings.emailMessages?.confirmedIntro || 'Tu reserva ha sido confirmada por el administrador. ¡Ya tienes tu espacio asegurado!';
  const outro = settings.emailMessages?.confirmedOutro || 'Recuerda llegar puntual. Si necesitas cancelar, hazlo con anticipación desde la aplicación.';

  const html = baseTemplate(`
    <h2 style="color: #3fb950; margin-top: 0;">¡Tu reserva fue confirmada!</h2>
    <p>Hola <strong>${userName}</strong>,</p>
    <p>${intro}</p>
    <div style="background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${dateLabel}</p>
      ${formatHoursList(hours)}
    </div>
    <p style="color: #8b949e;">
      ${outro}
    </p>
  `);

  await addDoc(collection(db, 'mail'), {
    to,
    message: {
      subject: `Reserva confirmada — ${dateLabel} (${hours.length}h)`,
      html,
    },
  });
}

// ─── Correo 2: Reserva Cancelada ─────────────────────────────────────────────
/**
 * UN correo con todas las horas canceladas.
 * @param {number|number[]} startTime - Hora única o array de horas
 */
export async function sendCancellationEmail({ to, userName, date, startTime, cancelledByAdmin = false }) {
  const hours = Array.isArray(startTime) ? startTime : [startTime];
  const dateLabel = formatDate(date);
  const reason = cancelledByAdmin
    ? 'El administrador canceló tu reserva.'
    : 'Cancelaste tu reserva exitosamente.';

  const html = baseTemplate(`
    <h2 style="color: #f85149; margin-top: 0;">Reserva Cancelada</h2>
    <p>Hola <strong>${userName}</strong>,</p>
    <p>${reason}</p>
    <div style="background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${dateLabel}</p>
      ${formatHoursList(hours)}
    </div>
    <p style="color: #8b949e;">
      Si tienes dudas, contacta al administrador de la sala.
      ${cancelledByAdmin ? '' : 'Puedes reservar otro bloque cuando quieras desde la aplicación.'}
    </p>
  `);

  await addDoc(collection(db, 'mail'), {
    to,
    message: {
      subject: `Reserva cancelada — ${dateLabel}`,
      html,
    },
  });
}

// ─── Correo 3: Hora Liberada (Waitlist) ──────────────────────────────────────
/**
 * Se envía a cada usuario en la lista de espera
 * cuando el bloque que querían se libera.
 */
export async function sendWaitlistNotificationEmail({ to, date, startTime }) {
  const dateLabel = formatDate(date);
  const hourLabel = formatHour(startTime);

  const html = baseTemplate(`
    <h2 style="color: #7c6afa; margin-top: 0;">¡La hora que querías está disponible!</h2>
    <p>Buenas noticias. El bloque que marcaste como de interés acaba de <strong>liberarse</strong>.</p>
    <div style="background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${dateLabel}</p>
      <p style="margin: 0;"><strong>Hora:</strong> ${hourLabel}</p>
    </div>
    <p style="color: #8b949e;">
      ¡Date prisa! La hora puede ser tomada por otra persona en cualquier momento.
    </p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://viteyfirebase.web.app/dashboard"
         style="background: linear-gradient(135deg, #7c6afa, #5b4df0); color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold;">
        Reservar ahora →
      </a>
    </div>
  `);

  await addDoc(collection(db, 'mail'), {
    to,
    message: {
      subject: `¡Hora disponible! — ${dateLabel} ${String(startTime).padStart(2, '0')}:00`,
      html,
    },
  });
}

// ─── Correo 3b: Reserva Pendiente (al USUARIO al crear) ─────────────────────
/**
 * Se envía AL USUARIO justo después de crear su reserva.
 * Incluye precio total, abono (25%) y datos de transferencia.
 * @param {number[]} hours - Array de horas reservadas [14, 15, 16]
 */
export async function sendPendingReservationEmail({ to, userName, date, hours }) {
  const dateLabel = formatDate(date);
  const sorted = [...hours].sort((a, b) => a - b);
  const numHoras = sorted.length;

  // Cargar configuración global
  const settings = await getSettings();

  // Cálculo de precios
  const precioPorHora = settings.pricePerHour;
  const precioTotal   = numHoras * precioPorHora;
  const abono         = Math.round(precioTotal * (settings.depositPercentage / 100));
  const bank          = settings.bankAccount;

  const html = baseTemplate(`
    <h2 style="color: #e3b341; margin-top: 0;">¡Tu bloque está reservado para ti!</h2>
    <p>Hola <strong>${userName}</strong>,</p>
    <p>${settings.emailMessages?.pendingIntro || 'Hemos recibido tu solicitud. El bloque está reservado provisionalmente a tu nombre. Para asegurar tu lugar, debes realizar el abono indicado y confirmar tu asistencia por WhatsApp.'}</p>

    <!-- Detalle de la reserva -->
    <div style="background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${dateLabel}</p>
      ${formatHoursList(sorted)}
    </div>

    <!-- Detalle de pago -->
    <div style="background: #161b22; border: 1px solid #e3b341; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0; color: #e3b341;"><strong>Detalle de pago</strong></p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #8b949e;">Precio por hora</td>
          <td style="padding: 6px 0; text-align: right;">${formatCLP(precioPorHora)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #8b949e;">N° de horas</td>
          <td style="padding: 6px 0; text-align: right;">${numHoras}h</td>
        </tr>
        <tr style="border-top: 1px solid #30363d;">
          <td style="padding: 10px 0 6px 0;"><strong>Total sesión</strong></td>
          <td style="padding: 10px 0 6px 0; text-align: right;"><strong>${formatCLP(precioTotal)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #e3b341;"><strong>Abono requerido (${settings.depositPercentage}%)</strong></td>
          <td style="padding: 6px 0; text-align: right; color: #e3b341;"><strong>${formatCLP(abono)}</strong></td>
        </tr>
      </table>
    </div>

    <!-- Datos de transferencia -->
    <div style="background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0;"><strong>Datos de transferencia</strong></p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 5px 0; color: #8b949e;">Titular</td><td style="padding: 5px 0; text-align: right;"><strong>${bank.name}</strong></td></tr>
        <tr><td style="padding: 5px 0; color: #8b949e;">N° de Cuenta</td><td style="padding: 5px 0; text-align: right;">${bank.account}</td></tr>
        <tr><td style="padding: 5px 0; color: #8b949e;">RUT</td><td style="padding: 5px 0; text-align: right;">${bank.rut}</td></tr>
        <tr><td style="padding: 5px 0; color: #8b949e;">Banco</td><td style="padding: 5px 0; text-align: right;">${bank.bank}</td></tr>
        <tr><td style="padding: 5px 0; color: #8b949e;">Tipo de cuenta</td><td style="padding: 5px 0; text-align: right;">${bank.type}</td></tr>
      </table>
    </div>

    <p style="color: #8b949e;">
      ${settings.emailMessages?.pendingOutro || 'Una vez realizado el abono, confirma tu asistencia enviando el comprobante por WhatsApp. El administrador aprobará tu reserva al recibirlo.'}
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="https://wa.me/${settings.whatsappNumber || '56968194161'}"
         style="background: #25D366; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
        Confirmar asistencia por WhatsApp
      </a>
    </div>
  `);

  await addDoc(collection(db, 'mail'), {
    to,
    message: {
      subject: `Tu bloque está reservado — ${dateLabel} (${numHoras}h)`,
      html,
    },
  });
}

// ─── Correo 4: Notificación al Admistrador (Nueva Reserva) ───────────────────
/**
 * Se envía AL ADMINISTRADOR cuando alguien crea una nueva reserva.
 */
export async function sendAdminNotificationEmail({ adminEmails, userName, userEmail, date, hours }) {
  const dateLabel = formatDate(date);

  const html = baseTemplate(`
    <h2 style="color: #e3b341; margin-top: 0;">Nueva Reserva Pendiente</h2>
    <p>¡El usuario <strong>${userName}</strong> (${userEmail}) ha solicitado reservas!</p>
    <div style="background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${dateLabel}</p>
      ${formatHoursList(hours)}
    </div>
    <p style="color: #8b949e;">
      Ingresa al panel de administrador para confirmar o rechazar este bloque.
    </p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://viteyfirebase.web.app/dashboard"
         style="background: linear-gradient(135deg, #7c6afa, #5b4df0); color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold;">
        Ir al Panel de Admin →
      </a>
    </div>
  `);

  await addDoc(collection(db, 'mail'), {
    to: adminEmails, // Soporta pasar un array de correos
    message: {
      subject: `Nueva solicitud de reserva — ${userName}`,
      html,
    },
  });
}
