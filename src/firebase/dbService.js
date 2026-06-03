import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import {
  sendConfirmationEmail,
  sendCancellationEmail,
  sendWaitlistNotificationEmail,
  sendAdminNotificationEmail,
  sendPendingReservationEmail,
} from './emailService';

/**
 * dbService.js
 * Centraliza todas las operaciones de lectura y escritura en Firestore.
 * Separar esto de los componentes nos permite cambiar la lógica de BD
 * sin tocar la interfaz visual.
 */

// ─── RESERVAS ────────────────────────────────────────────────────────────────

/**
 * Obtiene las reservas activas (pending/confirmed) de un día específico.
 * Usado por el calendario para saber qué bloques están ocupados.
 */
export async function getReservationsByDate(date) {
  // Limpiar reservas pendientes expiradas antes de leer el calendario
  await _cleanUpExpiredReservations().catch(e => console.error("Auto-cancel error:", e));

  const q = query(
    collection(db, 'reservations'),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  // Filtrar status en JS para evitar requerir un índice compuesto en Firestore
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => r.status === 'pending' || r.status === 'confirmed');
}

/**
 * Obtiene todas las reservas de un usuario (su historial completo).
 * Ordenado en el cliente para evitar índices compuestos en Firestore.
 */
export async function getReservationsByUser(userId) {
  const q = query(
    collection(db, 'reservations'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Ordenar por fecha de creación descendente en el cliente
  return data.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

/**
 * Obtiene TODAS las reservas (todos los estados) para calcular estadísticas.
 * Ordenado en el cliente por fecha.
 */
export async function getAllReservations() {
  // Limpiar antes de mostrar en admin panel
  await _cleanUpExpiredReservations().catch(e => console.error("Auto-cancel error:", e));

  const snap = await getDocs(collection(db, 'reservations'));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => (a.date > b.date ? 1 : -1));
}
/**
 * Crea reservas para MÚLTIPLES HORAS CONSECUTIVAS.
 *
 * Paso 1: Query para verificar que ningún slot esté tomado.
 * Paso 2: writeBatch atómico para crear todas las reservas + audit logs.
 *
 * @param {Object} params
 * @param {number[]} params.hours - Array de horas [14, 15, 16]
 */
export async function createMultipleReservations({ userId, userEmail, userName, date, hours }) {
  const settings = await getSettings();
  const maxHours = settings.maxHoursPerDay || 4;
  const maxReservations = settings.maxReservationsPerDay || 1;

  if (hours.length > maxHours) {
    throw new Error('MAX_HOURS_EXCEEDED');
  }

  // ── Paso 1: Verificar disponibilidad ──────────────────────────────────────
  // Solo filtramos por 'date' en Firestore para evitar requerir un índice compuesto.
  const slotQuery = query(
    collection(db, 'reservations'),
    where('date', '==', date)
  );
  const slotSnap = await getDocs(slotQuery);

  const userReservationsToday = slotSnap.docs.filter(d => {
    const data = d.data();
    return (data.status === 'pending' || data.status === 'confirmed') && data.userId === userId;
  });

  // Agrupar por hora contigua para contar cuántas "reservas" distintas tiene hoy
  const bookedHours = userReservationsToday.map(r => r.data().startTime).sort((a,b)=>a-b);
  let distinctBookings = 0;
  if (bookedHours.length > 0) {
    distinctBookings = 1;
    for (let i = 1; i < bookedHours.length; i++) {
      if (bookedHours[i] !== bookedHours[i-1] + 1) {
        distinctBookings++;
      }
    }
  }

  if (distinctBookings >= maxReservations) {
    throw new Error('YA_TIENES_RESERVA_HOY');
  }

  // Filtramos por status y por horas en JS
  const hoursSet = new Set(hours);
  const conflicts = slotSnap.docs.filter(d => {
    const data = d.data();
    return (data.status === 'pending' || data.status === 'confirmed')
      && hoursSet.has(data.startTime);
  });

  if (conflicts.length > 0) {
    throw new Error('HORA_OCUPADA');
  }

  // ── Paso 2: Crear todas las reservas en un batch atómico ──────────────────
  const batch = writeBatch(db);
  const reservationIds = [];

  for (const hour of hours) {
    const reservationRef = doc(collection(db, 'reservations'));
    batch.set(reservationRef, {
      userId,
      userEmail,
      userName,
      date,
      startTime: hour,
      endTime: hour + 1,
      roomId: 'sala-1',
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    // Audit log por hora
    const auditRef = doc(collection(db, 'audit_log'));
    batch.set(auditRef, {
      reservationId: reservationRef.id,
      date,
      startTime: hour,
      performedBy: userEmail,
      performedByRole: 'user',
      action: 'CREATE',
      fromStatus: null,
      toStatus: 'pending',
      timestamp: serverTimestamp(),
    });

    reservationIds.push(reservationRef.id);
  }

  await batch.commit();

  // ── Paso 3: Correo al usuario con datos de pago ───────────────────────────
  try {
    await sendPendingReservationEmail({
      to: userEmail,
      userName,
      date,
      hours,
    });
  } catch (err) {
    console.error('Error al enviar correo de reserva pendiente al usuario:', err);
  }

  // ── Paso 4: Notificar al administrador ────────────────────────────────────
  // Como no podemos consultar libremente la colección users para buscar a los admins
  // (por reglas de seguridad de Firestore), hardcodeamos el array temporalmente.
  const adminEmails = ['pvr789@gmail.com'];

  try {
    await sendAdminNotificationEmail({
      adminEmails,
      userName,
      userEmail,
      date,
      hours,
    });
  } catch (err) {
    console.error('Error al enviar notificación al admin:', err);
    // No bloqueamos el flujo si el correo falla
  }

  return reservationIds;

}

/**
 * El admin confirma una reserva (pending → confirmed).
 * Escribe en audit_log y dispara el correo de confirmación.
 */
export async function confirmReservation(reservation, adminEmail) {
  const batch = writeBatch(db);

  // 1. Actualizar reserva
  batch.update(doc(db, 'reservations', reservation.id), { status: 'confirmed' });

  // 2. Audit log
  const auditRef = doc(collection(db, 'audit_log'));
  batch.set(auditRef, {
    reservationId: reservation.id,
    date: reservation.date,
    startTime: reservation.startTime,
    performedBy: adminEmail,
    performedByRole: 'admin',
    action: 'CONFIRM',
    fromStatus: 'pending',
    toStatus: 'confirmed',
    timestamp: serverTimestamp(),
  });

  await batch.commit();

  // 3. Correo de confirmación al usuario
  try {
    await sendConfirmationEmail({
      to: reservation.userEmail,
      userName: reservation.userName,
      date: reservation.date,
      startTime: reservation.startTime,
    });
  } catch (emailErr) {
    console.warn('Correo de confirmación no enviado:', emailErr.message);
  }
}

/**
 * Cancela una reserva (usuario o admin).
 * Notifica a quien esté en la waitlist para ese slot.
 */
export async function cancelReservation(reservation, performedByEmail, performedByRole) {
  const batch = writeBatch(db);
  const action = performedByRole === 'admin' ? 'CANCEL_BY_ADMIN' : 'CANCEL_BY_USER';

  // 1. Actualizar reserva
  batch.update(doc(db, 'reservations', reservation.id), { status: 'cancelled' });

  // 2. Audit log
  const auditRef = doc(collection(db, 'audit_log'));
  batch.set(auditRef, {
    reservationId: reservation.id,
    date: reservation.date,
    startTime: reservation.startTime,
    performedBy: performedByEmail,
    performedByRole,
    action,
    fromStatus: reservation.status,
    toStatus: 'cancelled',
    timestamp: serverTimestamp(),
  });

  await batch.commit();

  // 3. Correo de cancelación al usuario
  try {
    await sendCancellationEmail({
      to: reservation.userEmail,
      userName: reservation.userName,
      date: reservation.date,
      startTime: reservation.startTime,
      cancelledByAdmin: performedByRole === 'admin',
    });
  } catch (emailErr) {
    console.warn('Correo de cancelación no enviado:', emailErr.message);
  }

  // 4. Notificar waitlist
  await _notifyWaitlist(reservation.date, reservation.startTime);
}

/**
 * Confirma MÚLTIPLES reservas del mismo usuario/día en un solo batch.
 * Envía UN solo correo con todas las horas.
 */
export async function confirmMultipleReservations(reservations, adminEmail) {
  if (reservations.length === 0) return;

  const batch = writeBatch(db);

  for (const r of reservations) {
    batch.update(doc(db, 'reservations', r.id), { status: 'confirmed' });

    const auditRef = doc(collection(db, 'audit_log'));
    batch.set(auditRef, {
      reservationId: r.id,
      date: r.date,
      startTime: r.startTime,
      performedBy: adminEmail,
      performedByRole: 'admin',
      action: 'CONFIRM',
      fromStatus: 'pending',
      toStatus: 'confirmed',
      timestamp: serverTimestamp(),
    });
  }

  await batch.commit();

  // UN solo correo con todas las horas
  const first = reservations[0];
  const allHours = reservations.map(r => r.startTime);
  try {
    await sendConfirmationEmail({
      to: first.userEmail,
      userName: first.userName,
      date: first.date,
      startTime: allHours,
    });
  } catch (emailErr) {
    console.warn('Correo de confirmación no enviado:', emailErr.message);
  }
}

/**
 * Cancela MÚLTIPLES reservas del mismo usuario/día en un solo batch.
 * Envía UN solo correo y notifica waitlist de cada hora.
 */
export async function cancelMultipleReservations(reservations, performedByEmail, performedByRole) {
  if (reservations.length === 0) return;

  const batch = writeBatch(db);
  const action = performedByRole === 'admin' ? 'CANCEL_BY_ADMIN' : 'CANCEL_BY_USER';

  for (const r of reservations) {
    batch.update(doc(db, 'reservations', r.id), { status: 'cancelled' });

    const auditRef = doc(collection(db, 'audit_log'));
    batch.set(auditRef, {
      reservationId: r.id,
      date: r.date,
      startTime: r.startTime,
      performedBy: performedByEmail,
      performedByRole,
      action,
      fromStatus: r.status,
      toStatus: 'cancelled',
      timestamp: serverTimestamp(),
    });
  }

  await batch.commit();

  // UN solo correo
  const first = reservations[0];
  const allHours = reservations.map(r => r.startTime);
  try {
    await sendCancellationEmail({
      to: first.userEmail,
      userName: first.userName,
      date: first.date,
      startTime: allHours,
      cancelledByAdmin: performedByRole === 'admin',
    });
  } catch (emailErr) {
    console.warn('Correo de cancelación no enviado:', emailErr.message);
  }

  // Notificar waitlist por cada hora liberada
  for (const r of reservations) {
    await _notifyWaitlist(r.date, r.startTime);
  }
}

// ─── WAITLIST ─────────────────────────────────────────────────────────────────

/**
 * Inscribe a un usuario en la lista de espera para un slot.
 * Primero verifica que no esté ya inscrito para evitar duplicados.
 */
export async function joinWaitlist({ userId, userEmail, date, startTime }) {
  // Verificar duplicado
  const q = query(
    collection(db, 'waitlist'),
    where('date', '==', date),
    where('startTime', '==', startTime),
    where('userId', '==', userId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) return 'already_exists';

  await addDoc(collection(db, 'waitlist'), {
    userId,
    userEmail,
    date,
    startTime,
    createdAt: serverTimestamp(),
  });
  return 'added';
}

/**
 * Función privada: busca en la waitlist y envía correos a los interesados.
 */
async function _notifyWaitlist(date, startTime) {
  // Omitir notificación si la hora ya pasó
  try {
    const slotTime = new Date(`${date}T${String(startTime).padStart(2, '0')}:00:00`);
    if (new Date() >= slotTime) {
      console.log(`[Waitlist] Omitiendo notificación porque el bloque ya pasó: ${date} ${startTime}:00`);
      return;
    }
  } catch (e) {
    console.error("Error validando fecha en _notifyWaitlist", e);
  }

  const q = query(
    collection(db, 'waitlist'),
    where('date', '==', date),
    where('startTime', '==', startTime)
  );
  const snap = await getDocs(q);

  if (snap.empty) return;

  // Enviar correo a cada persona en la lista de espera
  const emailPromises = snap.docs.map(waitDoc =>
    sendWaitlistNotificationEmail({
      to: waitDoc.data().userEmail,
      date,
      startTime,
    }).catch(err => console.warn('Error notificando waitlist:', err.message))
  );

  await Promise.all(emailPromises);
  console.log(`[Waitlist] Notificados ${snap.size} usuario(s) del slot ${date} ${startTime}:00`);
}

// ─── USUARIOS (ADMIN) ─────────────────────────────────────────────────────────

/**
 * Obtiene todos los usuarios registrados.
 */
export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Activa o desactiva una cuenta de usuario.
 */
export async function setUserActive(userId, isActive, adminEmail) {
  const batch = writeBatch(db);

  batch.update(doc(db, 'users', userId), { isActive });

  const auditRef = doc(collection(db, 'audit_log'));
  batch.set(auditRef, {
    reservationId: null,
    targetUserId: userId,
    performedBy: adminEmail,
    performedByRole: 'admin',
    action: isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
    fromStatus: null,
    toStatus: null,
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

/**
 * Obtiene el historial de auditoría (solo para el admin).
 * Ordenado en el cliente para evitar índice compuesto.
 */
export async function getAuditLog() {
  const snap = await getDocs(collection(db, 'audit_log'));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => {
    const ta = a.timestamp?.toMillis?.() ?? 0;
    const tb = b.timestamp?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

// ─── CONFIGURACIONES GLOBALES (SETTINGS) ──────────────────────────────────────

/**
 * Obtiene la configuración global del sistema (límites, plazos, datos bancarios).
 */
export async function getSettings() {
  // Hardcodeamos el ID del documento global a 'global'
  const docRef = doc(db, 'settings', 'global');
  const snap = await getDocs(query(collection(db, 'settings')));
  
  const defaultSettings = {
    pricePerHour: 8000,
    depositPercentage: 25,
    maxDaysAhead: 30,
    maxHoursPerDay: 4,
    maxReservationsPerDay: 1,
    cancelDeadlineHours: 24,
    autoReleaseHours: 2,
    bankAccount: {
      name: 'VICENTE PATRICIO VILCHES ROMERO',
      rut: '17.471.333-2',
      bank: 'Mercado Pago',
      account: '1036956886',
      type: 'Cuenta Vista'
    },
    whatsappNumber: '56968194161',
    emailMessages: {
      pendingIntro: 'Hemos recibido tu solicitud. El bloque está reservado provisionalmente a tu nombre. Para asegurar tu lugar, debes realizar el abono indicado y confirmar tu asistencia por WhatsApp.',
      pendingOutro: 'Una vez realizado el abono, confirma tu asistencia enviando el comprobante por WhatsApp. El administrador aprobará tu reserva al recibirlo.',
      confirmedIntro: 'Tu reserva ha sido confirmada por el administrador. ¡Ya tienes tu espacio asegurado!',
      confirmedOutro: 'Recuerda llegar puntual. Si necesitas cancelar, hazlo con anticipación desde la aplicación.'
    }
  };

  if (snap.empty) {
    return defaultSettings;
  }
  
  const dbData = snap.docs[0].data();
  return {
    ...defaultSettings,
    ...dbData,
    bankAccount: {
      ...defaultSettings.bankAccount,
      ...(dbData.bankAccount || {})
    },
    emailMessages: {
      ...defaultSettings.emailMessages,
      ...(dbData.emailMessages || {})
    }
  };
}

/**
 * Actualiza la configuración global del sistema.
 */
export async function updateSettings(newSettings, adminEmail) {
  const batch = writeBatch(db);
  const docRef = doc(db, 'settings', 'global');
  
  batch.set(docRef, newSettings, { merge: true });

  const auditRef = doc(collection(db, 'audit_log'));
  batch.set(auditRef, {
    action: 'UPDATE_SETTINGS',
    performedBy: adminEmail,
    performedByRole: 'admin',
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

// ─── BLOQUEO DE DISPONIBILIDAD (ADMIN) ────────────────────────────────────────

export async function getBlockedSlots() {
  const snap = await getDocs(collection(db, 'blocked_slots'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function blockSlot({ date, startTime, isFullDay }, adminEmail) {
  const batch = writeBatch(db);
  const docRef = doc(collection(db, 'blocked_slots'));
  
  batch.set(docRef, {
    date,
    startTime: isFullDay ? null : startTime,
    isFullDay,
    createdAt: serverTimestamp()
  });

  const auditRef = doc(collection(db, 'audit_log'));
  batch.set(auditRef, {
    action: 'BLOCK_SLOT',
    date,
    startTime: isFullDay ? null : startTime,
    performedBy: adminEmail,
    performedByRole: 'admin',
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

export async function unblockSlot(slotId, adminEmail) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'blocked_slots', slotId));
  
  const auditRef = doc(collection(db, 'audit_log'));
  batch.set(auditRef, {
    action: 'UNBLOCK_SLOT',
    slotId,
    performedBy: adminEmail,
    performedByRole: 'admin',
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

// ─── ASISTENCIA (RF-13) ───────────────────────────────────────────────────────

export async function markAttendance(reservationId, attended, adminEmail) {
  const batch = writeBatch(db);
  
  batch.update(doc(db, 'reservations', reservationId), { attended });

  const auditRef = doc(collection(db, 'audit_log'));
  batch.set(auditRef, {
    reservationId,
    action: attended ? 'MARK_ATTENDED' : 'MARK_ABSENT',
    performedBy: adminEmail,
    performedByRole: 'admin',
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Función interna: busca reservas pendientes cuya fecha de creación
 * supera el tiempo límite y las pasa a 'cancelled'.
 */
async function _cleanUpExpiredReservations() {
  const settings = await getSettings();
  const autoReleaseHours = settings.autoReleaseHours !== undefined ? Number(settings.autoReleaseHours) : 2;
  
  if (autoReleaseHours <= 0) return; // 0 significa deshabilitado
  
  const limitMillis = Date.now() - (autoReleaseHours * 60 * 60 * 1000);

  const q = query(
    collection(db, 'reservations'),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  
  const toCancel = snap.docs.filter(d => {
    const data = d.data();
    if (!data.createdAt) return false;
    // toMillis() existe en objetos Timestamp de Firestore
    const createdMillis = data.createdAt.toMillis ? data.createdAt.toMillis() : 0;
    return createdMillis > 0 && createdMillis < limitMillis;
  });

  if (toCancel.length === 0) return;

  const batch = writeBatch(db);
  toCancel.forEach(docSnap => {
    batch.update(docSnap.ref, { status: 'cancelled' });
    
    const auditRef = doc(collection(db, 'audit_log'));
    batch.set(auditRef, {
      reservationId: docSnap.id,
      date: docSnap.data().date,
      startTime: docSnap.data().startTime,
      performedBy: 'system',
      performedByRole: 'system',
      action: 'SYSTEM_AUTO_CANCEL',
      fromStatus: 'pending',
      toStatus: 'cancelled',
      timestamp: serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`[AutoCancel] Canceladas ${toCancel.length} reservas expiradas.`);
}
