import { useState, useEffect } from 'react';
import { addHours, isBefore, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import {
  getReservationsByDate,
  createMultipleReservations,
  joinWaitlist,
  getSettings,
  getBlockedSlots,
} from '../firebase/dbService';
import toast from 'react-hot-toast';

// Bloques disponibles: 08 al 23 (16 horas)
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);

// Devuelve "YYYY-MM-DD" de una fecha Date
function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function Calendar() {
  const { currentUser, userProfile, isActive } = useAuth();

  const [selectedDate, setSelectedDate]     = useState(toDateString(new Date()));
  const [reservations, setReservations]     = useState([]);
  const [loadingSlots, setLoadingSlots]     = useState(true); // true en la primera carga
  const [isFirstLoad, setIsFirstLoad]       = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [settings, setSettings]             = useState(null);
  const [blockedSlots, setBlockedSlots]     = useState([]);

  // ── Selección multi-hora ──────────────────────────────────────────────────
  const [selectedHours, setSelectedHours]   = useState([]); // [14, 15, 16] = bloque continuo
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ── Cargar reservas del día seleccionado ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingSlots(true);
      setSelectedHours([]); // limpiar selección al cambiar de día
      try {
        const [resData, settingsData, blocksData] = await Promise.all([
          getReservationsByDate(selectedDate),
          getSettings(),
          getBlockedSlots()
        ]);
        setReservations(resData);
        setSettings(settingsData);
        setBlockedSlots(blocksData.filter(b => b.date === selectedDate));
      } catch (e) {
        // Solo mostrar error si NO es la primera carga (evita el toast fugaz)
        if (!isFirstLoad) {
          toast.error('Error al cargar el horario');
        }
      } finally {
        setLoadingSlots(false);
        setIsFirstLoad(false);
      }
    };
    load();
  }, [selectedDate]);

  // ── Estado de cada slot ──────────────────────────────────────────────────
  const getSlotStatus = (hour) => {
    // Verificar si el slot está bloqueado por el admin
    const isBlocked = blockedSlots.some(b => b.isFullDay || b.startTime === hour);
    if (isBlocked) return { status: 'past' }; // Usamos 'past' visualmente para no disponible

    const reservation = reservations.find(r => r.startTime === hour);
    if (reservation) return { status: 'taken', reservation };

    const slotTime = new Date(`${selectedDate}T${String(hour).padStart(2, '0')}:00:00`);
    const cutoff   = addHours(new Date(), 1);
    if (isBefore(slotTime, cutoff)) return { status: 'past' };

    return { status: 'free' };
  };

  // ── Lógica de selección: solo horas consecutivas ──────────────────────────
  const toggleHourSelection = (hour) => {
    if (!isActive) {
      toast.error('Tu cuenta está desactivada. Contacta al administrador.');
      return;
    }

    const hasReservationThisDay = reservations.some(r => r.userId === currentUser.uid);

    setSelectedHours(prev => {
      // Si ya está seleccionada → deseleccionar
      if (prev.includes(hour)) {
        // Solo permitir deseleccionar desde los extremos (mantener consecutividad)
        const min = Math.min(...prev);
        const max = Math.max(...prev);
        if (hour !== min && hour !== max && prev.length > 1) {
          toast.error('Solo puedes deseleccionar desde los extremos del bloque');
          return prev;
        }
        return prev.filter(h => h !== hour);
      }

      // Si el usuario ya tiene reservas hoy, chequear límite de reservas por día
      const userReservationsCount = hasReservationThisDay ? 1 : 0; // Simplificado: si tiene al menos 1, es 1 sesión. Si se permiten N, habría que contar agrupaciones
      if (hasReservationThisDay && settings?.maxReservationsPerDay === 1) {
        toast.error(`Solo puedes pedir ${settings.maxReservationsPerDay} vez por día.`);
        return prev;
      }

      // Si no hay nada seleccionado → seleccionar
      if (prev.length === 0) return [hour];

      // Si ya hay selección → solo permitir hora adyacente
      const min = Math.min(...prev);
      const max = Math.max(...prev);

      if (hour === min - 1 || hour === max + 1) {
        const limit = settings?.maxHoursPerDay || 4;
        if (prev.length >= limit) {
          toast.error(`Puedes pedir ${limit} horas de corrido como máximo.`);
          return prev;
        }
        return [...prev, hour].sort((a, b) => a - b);
      }

      // No es adyacente → reemplazar toda la selección
      return [hour];
    });
  };

  // ── Reservar el bloque seleccionado ──────────────────────────────────────
  const handleBookSelected = async () => {
    if (selectedHours.length === 0) return;

    setBookingInProgress(true);
    try {
      await createMultipleReservations({
        userId:    currentUser.uid,
        userEmail: currentUser.email,
        userName:  userProfile?.displayName ?? currentUser.email,
        date:      selectedDate,
        hours:     selectedHours,
      });

      const minH = Math.min(...selectedHours);
      const maxH = Math.max(...selectedHours) + 1;
      toast.success(
        `✅ Bloque ${String(minH).padStart(2,'0')}:00–${String(maxH).padStart(2,'0')}:00 reservado (${selectedHours.length}h). Pendiente de confirmación.`
      );

      setSelectedHours([]);
      const updated = await getReservationsByDate(selectedDate);
      setReservations(updated);
    } catch (e) {
      console.error('❌ Error al reservar:', e.code, e.message, e);
      if (e.message === 'HORA_OCUPADA') {
        toast.error('⚡ Alguna de las horas seleccionadas ya fue tomada.');
        const updated = await getReservationsByDate(selectedDate);
        setReservations(updated);
        setSelectedHours([]);
      } else if (e.message === 'YA_TIENES_ESTA_HORA' || e.message === 'YA_TIENES_RESERVA_HOY') {
        toast.error('Ya tienes reservas activas excediendo tu límite hoy.');
      } else if (e.message === 'MAXIMO_4_HORAS') {
        toast.error(`Puedes pedir ${settings?.maxHoursPerDay || 4} horas de corrido como máximo.`);
      } else {
        toast.error('Error al reservar. Intenta de nuevo.');
      }
    } finally {
      setBookingInProgress(false);
      setShowConfirmModal(false);
    }
  };

  // ── Waitlist ──────────────────────────────────────────────────────────────
  const handleWaitlist = async (hour) => {
    try {
      const result = await joinWaitlist({
        userId:    currentUser.uid,
        userEmail: currentUser.email,
        date:      selectedDate,
        startTime: hour,
      });
      if (result === 'already_exists') {
        toast('Ya estás en la lista de espera para este bloque 🔔', { icon: 'ℹ️' });
      } else {
        toast.success('¡Listo! Te avisaremos si esta hora queda libre 🔔');
      }
    } catch {
      toast.error('Error al unirse a la lista de espera');
    }
  };

  // ── Formato de fecha ─────────────────────────────────────────────────────
  const displayDate = format(parseISO(selectedDate), "EEEE d 'de' MMMM yyyy", { locale: es });
  const today   = toDateString(new Date());
  const maxDate = toDateString(addHours(new Date(), 24 * (settings?.maxDaysAhead || 30)));

  // ── Resumen de la selección ──────────────────────────────────────────────
  const selectionSummary = selectedHours.length > 0 ? (() => {
    const sorted = [...selectedHours].sort((a, b) => a - b);
    const minH = sorted[0];
    const maxH = sorted[sorted.length - 1] + 1;
    return `${String(minH).padStart(2,'0')}:00 — ${String(maxH).padStart(2,'0')}:00 (${sorted.length}h)`;
  })() : '';

  return (
    <div className="calendar-section">
      {/* ── Selector de fecha ── */}
      <div className="calendar-header">
        <h3 className="calendar-title">Selecciona un día</h3>
        <input
          id="date-picker"
          type="date"
          value={selectedDate}
          min={today}
          max={maxDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="date-input"
        />
      </div>

      <p className="calendar-day-label">
        📅 {displayDate.charAt(0).toUpperCase() + displayDate.slice(1)}
      </p>

      {/* ── Instrucción ── */}
      <p className="calendar-instruction">
        Haz clic en las horas que quieras reservar. Solo se permiten bloques continuos.
      </p>

      {/* ── Leyenda ── */}
      <div className="calendar-legend">
        <span className="legend-item free">Disponible</span>
        <span className="legend-item selected-legend">Seleccionado</span>
        <span className="legend-item taken">Ocupado</span>
        <span className="legend-item past">No disponible</span>
      </div>

      {/* ── Grid de bloques ── */}
      {loadingSlots ? (
        <div className="slots-loading">Cargando horario...</div>
      ) : (
        <div className="slots-grid">
          {HOURS.map(hour => {
            const { status, reservation } = getSlotStatus(hour);
            const isSelected = selectedHours.includes(hour);

            return (
              <div
                key={hour}
                className={`slot slot-${status} ${isSelected ? 'slot-selected' : ''}`}
              >
                <div className="slot-time">
                  {String(hour).padStart(2, '0')}:00
                  <span className="slot-arrow">→</span>
                  {String(hour + 1).padStart(2, '0')}:00
                </div>

                {status === 'free' && (
                  <button
                    className={`slot-btn ${isSelected ? 'slot-btn-selected' : 'slot-btn-book'}`}
                    onClick={() => toggleHourSelection(hour)}
                    disabled={bookingInProgress || !isActive}
                  >
                    {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                  </button>
                )}

                {status === 'taken' && (
                  <div className="slot-taken-info">
                    <span className="slot-taken-label">
                      {reservation?.userId === currentUser.uid
                        ? '📌 Mi reserva'
                        : '🔒 Ocupado'}
                    </span>
                    {reservation?.userId !== currentUser.uid && (
                      <button
                        className="slot-btn slot-btn-waitlist"
                        onClick={() => handleWaitlist(hour)}
                        title="Avísame si se libera"
                      >
                        🔔 Avisar
                      </button>
                    )}
                  </div>
                )}

                {status === 'past' && (
                  <span className="slot-past-label">No disponible</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Barra de selección flotante ── */}
      {selectedHours.length > 0 && (
        <div className="selection-bar">
          <div className="selection-info">
            <span className="selection-count">{selectedHours.length}h seleccionada{selectedHours.length > 1 ? 's' : ''}</span>
            <span className="selection-range">{selectionSummary}</span>
          </div>
          <div className="selection-actions">
            <button
              className="btn-outline"
              onClick={() => setSelectedHours([])}
              disabled={bookingInProgress}
            >
              Limpiar
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowConfirmModal(true)}
              disabled={bookingInProgress}
            >
              Reservar {selectedHours.length}h
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de confirmación ── */}
      {showConfirmModal && (() => {
        const PRECIO_HORA = settings?.pricePerHour || 8000;
        const depositPerc = settings?.depositPercentage || 25;
        const total = selectedHours.length * PRECIO_HORA;
        const abono = Math.round(total * (depositPerc / 100));
        const fmt   = (n) => '$' + n.toLocaleString('es-CL');
        return (
          <div className="modal-overlay" onClick={() => !bookingInProgress && setShowConfirmModal(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <h3>Confirmar reserva</h3>
              <p>
                ¿Reservar <strong>{selectedHours.length} hora{selectedHours.length > 1 ? 's' : ''}</strong> el día <strong>{displayDate}</strong>?
              </p>
              <div className="modal-hours-list">
                {[...selectedHours].sort((a,b)=>a-b).map(h => (
                  <span key={h} className="modal-hour-chip">
                    {String(h).padStart(2,'0')}:00 — {String(h+1).padStart(2,'0')}:00
                  </span>
                ))}
              </div>

              {/* ── Desglose de precio ── */}
              <div className="modal-price-box">
                <div className="modal-price-row">
                  <span>Precio por hora</span><span>{fmt(PRECIO_HORA)}</span>
                </div>
                <div className="modal-price-row">
                  <span>N° de horas</span><span>{selectedHours.length}h</span>
                </div>
                <div className="modal-price-row modal-price-total">
                  <span>Total sesión</span><span>{fmt(total)}</span>
                </div>
                <div className="modal-price-row modal-price-abono">
                  <span>💰 Abono requerido ({settings?.depositPercentage || 25}%)</span><span>{fmt(abono)}</span>
                </div>
              </div>

              <p className="modal-note">
                Recibirás un <strong>correo con los datos de transferencia</strong>. Envía el comprobante por WhatsApp para que el administrador confirme tu reserva.
              </p>
              <div className="modal-actions">
                <button
                  className="btn-outline"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={bookingInProgress}
                >
                  Cancelar
                </button>
                <button
                  className="btn-primary"
                  onClick={handleBookSelected}
                  disabled={bookingInProgress}
                >
                  {bookingInProgress ? 'Reservando...' : `Sí, reservar ${selectedHours.length}h`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Calendar;
