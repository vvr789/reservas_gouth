import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBlockedSlots, blockSlot, unblockSlot } from '../firebase/dbService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
      data.sort((a, b) => a.date > b.date ? 1 : -1);
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

  if (loading) return <div className="loading-state">Cargando disponibilidad...</div>;

  return (
    <div className="admin-section">
      <div className="admin-header">
        <h2>🗓️ Disponibilidad (Bloqueos)</h2>
        <p className="admin-subtitle">Desactiva días completos o bloques de hora para que no puedan ser reservados.</p>
      </div>

      <div className="availability-container">
        <form onSubmit={handleBlock} className="block-form card">
          <h3>Bloquear Nuevo Horario</h3>
          
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input 
                type="checkbox" 
                checked={isFullDay} 
                onChange={(e) => setIsFullDay(e.target.checked)} 
              />
              Bloquear el día completo
            </label>
          </div>

          {!isFullDay && (
            <div className="form-group">
              <label>Hora de inicio</label>
              <select value={startTime} onChange={(e) => setStartTime(e.target.value)} required>
                <option value="">Selecciona una hora</option>
                {[...Array(16)].map((_, i) => {
                  const h = i + 8; // De 08:00 a 23:00
                  return <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                })}
              </select>
            </div>
          )}

          <button type="submit" className="btn-danger" style={{ marginTop: '16px', width: '100%' }}>
            🔒 Bloquear
          </button>
        </form>

        <div className="blocked-list">
          <h3>Horarios Bloqueados</h3>
          {blocked.length === 0 ? (
            <p className="empty-state">No hay horarios bloqueados actualmente.</p>
          ) : (
            <ul className="log-list">
              {blocked.map(b => (
                <li key={b.id} className="log-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{b.date}</strong> — {b.isFullDay ? 'Día Completo' : `Hora: ${b.startTime}:00`}
                  </div>
                  <button onClick={() => handleUnblock(b.id)} className="btn-admin-link" style={{ color: '#3fb950' }}>
                    Desbloquear
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
