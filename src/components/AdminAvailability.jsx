import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBlockedSlots, blockSlot, unblockSlot } from '../firebase/dbService';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Lock, Unlock, AlertTriangle, ShieldAlert, Check } from 'lucide-react';

export default function AdminAvailability() {
  const { currentUser } = useAuth();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formularios
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);

  useEffect(() => {
    loadBlocks();
  }, []);

  async function loadBlocks() {
    try {
      const data = await getBlockedSlots();
      // Ordenar: primero los más lejanos o por fecha
      data.sort((a, b) => (a.date > b.date ? 1 : -1));
      setBlocked(data);
    } catch (err) {
      toast.error('Error al cargar bloqueos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleBlock = async (e) => {
    e.preventDefault();
    if (!date) return toast.error('Selecciona una fecha');
    if (!isFullDay && !startTime) return toast.error('Selecciona una hora o marca día completo');

    try {
      await blockSlot({
        date,
        startTime: isFullDay ? null : parseInt(startTime),
        isFullDay
      }, currentUser.email);
      toast.success('Disponibilidad bloqueada');
      setDate('');
      setStartTime('');
      loadBlocks();
    } catch (err) {
      toast.error('Error al bloquear: ' + err.message);
    }
  };

  const handleUnblock = async (slotId) => {
    if (!window.confirm('¿Desbloquear este horario?')) return;
    try {
      await unblockSlot(slotId, currentUser.email);
      toast.success('Horario desbloqueado');
      loadBlocks();
    } catch (err) {
      toast.error('Error al desbloquear: ' + err.message);
    }
  };

  // Helper para dar formato premium a las fechas
  const formatFriendlyDate = (dateStr) => {
    try {
      const parsed = parseISO(`${dateStr}T00:00:00`);
      const formatted = format(parsed, "EEEE d 'de' MMMM, yyyy", { locale: es });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Cargando disponibilidad...</p>
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="admin-header-row">
        <div className="admin-header-title">
          <ShieldAlert size={28} className="text-accent" style={{ color: 'var(--accent)' }} />
          <div>
            <h2>Disponibilidad (Bloqueos)</h2>
            <p className="admin-subtitle">Desactiva días completos o bloques de hora para que no puedan ser reservados.</p>
          </div>
        </div>
      </div>

      <div className="availability-container">
        {/* Formulario de bloqueo */}
        <form onSubmit={handleBlock} className="block-form card">
          <div className="form-card-header">
            <Lock size={20} className="text-accent" style={{ color: 'var(--accent)' }} />
            <h3>Bloquear Nuevo Horario</h3>
          </div>
          
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} style={{ color: 'var(--accent)' }} />
              Fecha
            </label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div className="form-group checkbox-group-premium">
            <label className="checkbox-label-premium">
              <input 
                type="checkbox" 
                checked={isFullDay} 
                onChange={(e) => setIsFullDay(e.target.checked)} 
              />
              <span className="checkbox-custom-box">
                {isFullDay && <Check size={14} />}
              </span>
              <span className="checkbox-text">Bloquear el día completo</span>
            </label>
          </div>

          {!isFullDay && (
            <div className="form-group" style={{ animation: 'fadeIn 0.25s ease' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} style={{ color: 'var(--accent)' }} />
                Hora de inicio
              </label>
              <select value={startTime} onChange={(e) => setStartTime(e.target.value)} required>
                <option value="">Selecciona una hora</option>
                {[...Array(16)].map((_, i) => {
                  const h = i + 8; // De 08:00 a 23:00
                  const nextH = h + 1;
                  return (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00 - {String(nextH).padStart(2, '0')}:00
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <button type="submit" className="btn-danger" style={{ marginTop: '1rem', width: '100%' }}>
            Bloquear
          </button>
        </form>

        {/* Listado de bloqueos actuales */}
        <div className="blocked-list card">
          <div className="form-card-header">
            <Unlock size={20} className="text-accent" style={{ color: 'var(--accent)' }} />
            <h3>Horarios Bloqueados</h3>
          </div>
          
          {blocked.length === 0 ? (
            <div className="empty-state-container">
              <AlertTriangle size={32} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
              <p className="empty-state">No hay horarios bloqueados actualmente.</p>
            </div>
          ) : (
            <div className="blocked-scrollable">
              <ul className="log-list">
                {blocked.map(b => (
                  <li key={b.id} className="log-item blocked-item" style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div className="blocked-item-info">
                      <div className="blocked-icon-wrapper">
                        <Calendar size={18} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="blocked-text-details">
                        <strong className="blocked-date">{formatFriendlyDate(b.date)}</strong>
                        <div className="blocked-badge-container">
                          {b.isFullDay ? (
                            <span className="badge-tag badge-red">Día Completo</span>
                          ) : (
                            <span className="badge-tag badge-orange">
                              <Clock size={11} style={{ marginRight: '4px' }} />
                              {String(b.startTime).padStart(2, '0')}:00 - {String(b.startTime + 1).padStart(2, '0')}:00
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUnblock(b.id)} 
                      className="btn-unblock-action"
                      title="Desbloquear este horario"
                    >
                      <Unlock size={14} />
                      <span>Desbloquear</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
