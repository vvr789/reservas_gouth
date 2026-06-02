import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import {
  getAllReservations,
  confirmReservation,
  cancelReservation,
  confirmMultipleReservations,
  cancelMultipleReservations,
  markAttendance,
} from '../firebase/dbService';
import { Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', cls: 'status-pending' },
  confirmed: { label: 'Confirmada', cls: 'status-confirmed' },
  cancelled: { label: 'Cancelada', cls: 'status-cancelled' },
};

/**
 * Agrupa reservas por usuario + fecha para mostrarlas como bloques.
 * Ej: Si "Juan" reservó 14:00, 15:00, 16:00 el mismo día → un solo grupo.
 */
function groupReservations(reservations) {
  const groups = {};

  for (const r of reservations) {
    const key = `${r.userId}::${r.date}`;
    if (!groups[key]) {
      groups[key] = {
        key,
        userId: r.userId,
        userName: r.userName,
        userEmail: r.userEmail,
        date: r.date,
        reservations: [],
      };
    }
    groups[key].reservations.push(r);
  }

  // Ordenar las horas dentro de cada grupo
  for (const g of Object.values(groups)) {
    g.reservations.sort((a, b) => a.startTime - b.startTime);
    g.hours = g.reservations.map(r => r.startTime);
    g.minHour = g.hours[0];
    g.maxHour = g.hours[g.hours.length - 1] + 1;
    g.pendingReservations = g.reservations.filter(r => r.status === 'pending');
    g.hasAnyPending = g.pendingReservations.length > 0;
  }

  return Object.values(groups).sort((a, b) =>
    a.date > b.date ? 1 : a.date < b.date ? -1 : a.minHour - b.minHour
  );
}

function AdminReservations() {
  const { currentUser } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null); // group key en proceso
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllReservations();
      setReservations(data);
    } catch {
      toast.error('Error al cargar reservas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Confirmar bloque completo (un correo) ──────────────────────────────────
  const handleConfirmBlock = async (group) => {
    const pending = group.pendingReservations;
    if (pending.length === 0) return;

    setProcessing(group.key);
    try {
      if (pending.length === 1) {
        await confirmReservation(pending[0], currentUser.email);
      } else {
        await confirmMultipleReservations(pending, currentUser.email);
      }
      toast.success(`Bloque de ${group.userName} confirmado (${pending.length}h)`);
      await load();
    } catch {
      toast.error('Error al confirmar.');
    } finally {
      setProcessing(null);
    }
  };

  // ── Cancelar bloque completo (un correo) ───────────────────────────────────
  const handleCancelBlock = async (group) => {
    const active = group.reservations.filter(r => r.status !== 'cancelled');
    if (active.length === 0) return;
    if (!window.confirm(`¿Cancelar ${active.length} hora(s) de ${group.userName} del ${group.date}?`)) return;

    setProcessing(group.key);
    try {
      if (active.length === 1) {
        await cancelReservation(active[0], currentUser.email, 'admin');
      } else {
        await cancelMultipleReservations(active, currentUser.email, 'admin');
      }
      toast.success(`Bloque cancelado (${active.length}h)`);
      await load();
    } catch {
      toast.error('Error al cancelar.');
    } finally {
      setProcessing(null);
    }
  };

  // ── Marcar asistencia ──────────────────────────────────────────────────────
  const handleSingleAttendance = async (reservation, attended, groupKey) => {
    setProcessing(groupKey);
    try {
      await markAttendance(reservation.id, attended, currentUser.email);
      toast.success(`Asistencia de las ${reservation.startTime}:00 marcada`);
      await load();
    } catch {
      toast.error('Error al marcar asistencia.');
    } finally {
      setProcessing(null);
    }
  };

  // ── Filtro ─────────────────────────────────────────────────────────────────
  const filtered = filter === 'all'
    ? reservations
    : reservations.filter(r => r.status === filter);

  const groups = groupReservations(filtered);

  const formatDateStr = (dateStr) => {
    if (!dateStr) return 'Sin fecha';
    try {
      const d = format(parseISO(dateStr), "EEE d MMM", { locale: es });
      return d.charAt(0).toUpperCase() + d.slice(1);
    } catch {
      return typeof dateStr === 'string' ? dateStr : String(dateStr);
    }
  };

  const isPastStartTime = (dateStr, hour) => {
    try {
      const slotTime = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00`);
      return new Date() >= slotTime;
    } catch {
      return false;
    }
  };

  if (loading) return <div className="admin-section-loading">Cargando reservas...</div>;

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h3 className="section-title">Reservas Activas</h3>
        <div className="filter-tabs">
          {['all', 'pending', 'confirmed'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'filter-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Confirmadas'}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="reservations-empty">
          <Inbox size={48} style={{ marginBottom: '1rem', color: 'var(--text-muted)' }} />
          <p>No hay reservas en esta categoría.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Fecha</th>
                <th>Horas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => {
                const isProcessing = processing === group.key;

                return (
                  <tr key={group.key}>
                    <td>
                      <div className="table-user">
                        <span className="table-username">{group.userName}</span>
                        <span className="table-email">{group.userEmail}</span>
                      </div>
                    </td>
                    <td>{formatDateStr(group.date)}</td>
                    <td className="table-time">
                      <div className="table-hours-chips">
                        {group.reservations.map(r => (
                          <span
                            key={r.id}
                            className={`hour-chip ${r.status === 'confirmed' ? 'hour-chip-confirmed' : 'hour-chip-pending'}`}
                          >
                            {String(r.startTime).padStart(2, '0')}:00
                          </span>
                        ))}
                      </div>
                      <span className="table-time-range">
                        {String(group.minHour).padStart(2, '0')}:00 — {String(group.maxHour).padStart(2, '0')}:00 ({group.hours.length}h)
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const allConfirmed = group.reservations.every(r => r.status === 'confirmed');
                        const allPending = group.reservations.every(r => r.status === 'pending');
                        const { label, cls } = allConfirmed
                          ? STATUS_CONFIG.confirmed
                          : allPending
                            ? STATUS_CONFIG.pending
                            : { label: 'Mixto', cls: 'status-pending' };
                        return <span className={`status-badge ${cls}`}>{label}</span>;
                      })()}
                    </td>
                    <td>
                      <div className="table-actions">
                        {group.hasAnyPending && (
                          <button
                            className="btn-confirm-admin"
                            onClick={() => handleConfirmBlock(group)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? '...' : `Confirmar ${group.pendingReservations.length}h`}
                          </button>
                        )}
                        {(() => {
                          const past = isPastStartTime(group.date, group.minHour);
                          return (
                            <button
                              className="btn-cancel-admin"
                              onClick={() => handleCancelBlock(group)}
                              disabled={isProcessing || past}
                              title={past ? "No se puede cancelar una reserva que ya pasó" : ""}
                              style={past ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                              {isProcessing ? '...' : 'Cancelar'}
                            </button>
                          );
                        })()}
                        
                        {!group.hasAnyPending && group.reservations.every(r => r.status === 'confirmed') && (
                          <div className="attendance-toggles" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                            <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asistencia por hora</div>
                            {group.reservations.map(r => (
                              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: '#c9d1d9', width: '40px' }}>{String(r.startTime).padStart(2, '0')}:00</span>
                                {(() => {
                                  const canMark = isPastStartTime(group.date, r.startTime);
                                  return (
                                    <>
                                      <button
                                        className={`btn-admin-link ${r.attended === true ? 'active-attended' : ''}`}
                                        onClick={() => handleSingleAttendance(r, true, group.key)}
                                        disabled={isProcessing || !canMark}
                                        style={{ color: r.attended === true ? '#5c7f53' : '#8b949e', fontSize: '12px', padding: '2px 4px', opacity: canMark ? 1 : 0.3 }}
                                        title={canMark ? "" : "Solo se puede marcar asistencia después de la hora de inicio"}
                                      >
                                        Sí
                                      </button>
                                      <button
                                        className={`btn-admin-link ${r.attended === false ? 'active-absent' : ''}`}
                                        onClick={() => handleSingleAttendance(r, false, group.key)}
                                        disabled={isProcessing || !canMark}
                                        style={{ color: r.attended === false ? '#b85c5c' : '#8b949e', fontSize: '12px', padding: '2px 4px', opacity: canMark ? 1 : 0.3 }}
                                        title={canMark ? "" : "Solo se puede marcar asistencia después de la hora de inicio"}
                                      >
                                        No
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminReservations;
