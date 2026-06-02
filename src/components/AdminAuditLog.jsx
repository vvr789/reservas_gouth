import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAuditLog } from '../firebase/dbService';
import toast from 'react-hot-toast';

// Descripción legible de cada acción
const ACTION_CONFIG = {
  CREATE:           { label: 'Nueva reserva',         icon: '📅', cls: 'action-create' },
  CONFIRM:          { label: 'Confirmada por admin',  icon: '✅', cls: 'action-confirm' },
  CANCEL_BY_USER:   { label: 'Cancelada por usuario', icon: '❌', cls: 'action-cancel' },
  CANCEL_BY_ADMIN:  { label: 'Cancelada por admin',   icon: '🚫', cls: 'action-cancel' },
  USER_DEACTIVATED: { label: 'Usuario desactivado',   icon: '🔒', cls: 'action-warn' },
  USER_REACTIVATED: { label: 'Usuario reactivado',    icon: '🔓', cls: 'action-create' },
};

function AdminAuditLog() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAuditLog();
        setLogs(data);
      } catch {
        toast.error('Error al cargar la bitácora');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = logs.filter(l =>
    l.performedBy?.toLowerCase().includes(search.toLowerCase()) ||
    ACTION_CONFIG[l.action]?.label.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="admin-section-loading">Cargando bitácora...</div>;

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h3 className="section-title">Bitácora de Auditoría</h3>
        <input
          type="text"
          placeholder="🔍 Buscar por usuario o acción..."
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="reservations-empty">
          <span className="empty-icon">📝</span>
          <p>No hay registros en la bitácora aún.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Acción</th>
                <th>Quién</th>
                <th>Detalle</th>
                <th>Fecha y Hora</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, icon: '•', cls: '' };
                const ts  = log.timestamp?.toDate
                  ? format(log.timestamp.toDate(), "d MMM yyyy HH:mm", { locale: es })
                  : '—';

                return (
                  <tr key={log.id}>
                    <td>
                      <span className={`action-pill ${cfg.cls}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td>
                      <div className="table-user">
                        <span className="table-username">{log.performedBy}</span>
                        <span className={`role-badge ${log.performedByRole === 'admin' ? 'role-admin' : 'role-user'}`}>
                          {log.performedByRole}
                        </span>
                      </div>
                    </td>
                    <td className="table-detail">
                      {log.date
                        ? <>🗓 {log.date} — {String(log.startTime).padStart(2,'0')}:00</>
                        : log.targetUserId
                          ? <>👤 ID: {log.targetUserId.slice(0, 8)}...</>
                          : '—'}
                    </td>
                    <td className="table-date">{ts}</td>
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

export default AdminAuditLog;
