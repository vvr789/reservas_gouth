import { useState, useEffect } from 'react';
import { format, parseISO, addHours, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { getReservationsByUser, cancelReservation, getSettings } from '../firebase/dbService';
import { Calendar, Clock, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

// Mapeo de status a etiqueta y color (sin emojis)
const STATUS_CONFIG = {
  pending:   { label: 'Pendiente', cls: 'status-pending' },
  confirmed: { label: 'Confirmada', cls: 'status-confirmed' },
  cancelled: { label: 'Cancelada', cls: 'status-cancelled' },
};

function MyReservations() {
  const { currentUser } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [cancelling, setCancelling]     = useState(null);
  const [settings, setSettings]         = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [data, settingsData] = await Promise.all([
        getReservationsByUser(currentUser.uid),
        getSettings()
      ]);
      setReservations(data);
      setSettings(settingsData);
    } catch {
      toast.error('Error al cargar tus reservas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (reservation) => {
    if (!window.confirm(`¿Cancelar la reserva del ${reservation.date} a las ${reservation.startTime}:00?`)) return;
    setCancelling(reservation.id);
    try {
      await cancelReservation(reservation, currentUser.email, 'user');
      toast.success('Reserva cancelada');
      await load(); // Refrescar lista
    } catch {
      toast.error('Error al cancelar. Intenta de nuevo.');
    } finally {
      setCancelling(null);
    }
  };

  if (loading) return <div className="reservations-loading">Cargando tus reservas...</div>;
  if (reservations.length === 0) return (
    <div className="reservations-empty">
      <Inbox size={48} style={{ marginBottom: '1rem', color: 'var(--text-muted)' }} />
      <p>Aún no tienes reservas.<br />¡Usa el calendario para agendar tu primera hora!</p>
    </div>
  );

  return (
    <div className="reservations-section">
      <h3 className="section-title">Mis Reservas</h3>
      <div className="reservations-list">
        {reservations.map(r => {
          const { label, cls } = STATUS_CONFIG[r.status] ?? { label: r.status, cls: '' };
          const dateLabel = format(parseISO(r.date), "EEEE d 'de' MMMM yyyy", { locale: es });
          
          let canCancel = r.status === 'pending' || r.status === 'confirmed';
          if (canCancel && settings) {
            // Verificar plazo de cancelación
            const reservationTime = new Date(`${r.date}T${String(r.startTime).padStart(2, '0')}:00:00`);
            const cutoff = addHours(new Date(), settings.cancelDeadlineHours || 24);
            if (isBefore(reservationTime, cutoff)) {
              canCancel = false;
            }
          }

          return (
            <div key={r.id} className={`reservation-card ${r.status === 'cancelled' ? 'reservation-cancelled' : ''}`}>
              <div className="reservation-info">
                <div className="reservation-date" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} />
                  <span>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</span>
                </div>
                <div className="reservation-time" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <Clock size={16} />
                  <span>{String(r.startTime).padStart(2, '0')}:00 — {String(r.endTime).padStart(2, '0')}:00 hrs</span>
                </div>
              </div>

              <div className="reservation-actions">
                <span className={`status-badge ${cls}`}>{label}</span>
                {canCancel ? (
                  <button
                    className="btn-cancel-res"
                    onClick={() => handleCancel(r)}
                    disabled={cancelling === r.id}
                  >
                    {cancelling === r.id ? 'Cancelando...' : 'Cancelar'}
                  </button>
                ) : (
                  (r.status === 'pending' || r.status === 'confirmed') && (
                    <span style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px', display: 'block', textAlign: 'center' }}>
                      Fuera de plazo para cancelar
                    </span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MyReservations;
