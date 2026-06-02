import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar as CalendarIcon, Lock, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);

// Devuelve "YYYY-MM-DD" de una fecha Date
function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function MockCalendar() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));

  // Simular horarios ocupados fijos para dar sensación de realismo sin consultar BD
  // Por ejemplo: 10:00, 14:00, 15:00, 19:00 y 20:00
  const mockOccupiedHours = [10, 14, 15, 19, 20];

  const handleAction = () => {
    toast.error('Inicia sesión para reservar tu hora en tiempo real');
    navigate('/login');
  };

  const getDisplayDateLabel = () => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const label = date.toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return label.charAt(0).toUpperCase() + label.slice(1);
    } catch {
      return 'Selecciona un día';
    }
  };

  const today = toDateString(new Date());
  const maxDate = toDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // +30 días

  return (
    <div className="calendar-section">
      {/* ── Selector de fecha estático ── */}
      <div className="calendar-header">
        <h3 className="calendar-title">Disponibilidad de la Sala (Demo)</h3>
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

      <p className="calendar-day-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <CalendarIcon size={16} />
        <span>{getDisplayDateLabel()}</span>
      </p>

      {/* ── Instrucción ── */}
      <p className="calendar-instruction">
        Haz clic en las horas disponibles para reservar tu bloque de ensayo.
      </p>

      {/* ── Leyenda ── */}
      <div className="calendar-legend">
        <span className="legend-item free">Disponible</span>
        <span className="legend-item taken">Ocupado</span>
        <span className="legend-item past">No disponible</span>
      </div>

      {/* ── Grid de bloques estáticos ── */}
      <div className="slots-grid">
        {HOURS.map(hour => {
          const isTaken = mockOccupiedHours.includes(hour);
          const isPast = hour < 9; // Simular que bloques temprano ya pasaron

          let status = 'free';
          if (isPast) status = 'past';
          else if (isTaken) status = 'taken';

          return (
            <div
              key={hour}
              className={`slot slot-${status}`}
            >
              <div className="slot-time">
                {String(hour).padStart(2, '0')}:00 - {String(hour + 1).padStart(2, '0')}:00
              </div>

              {status === 'free' && (
                <button
                  className="slot-btn slot-btn-book"
                  onClick={handleAction}
                >
                  Reservar
                </button>
              )}

              {status === 'taken' && (
                <div className="slot-taken-info">
                  <span className="slot-taken-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={12} />
                    <span>Ocupado</span>
                  </span>
                  <button
                    className="slot-btn slot-btn-waitlist"
                    onClick={handleAction}
                    title="Avísame si se libera"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                  >
                    <Bell size={12} />
                    <span>Avisar</span>
                  </button>
                </div>
              )}

              {status === 'past' && (
                <span className="slot-past-label">No disponible</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
