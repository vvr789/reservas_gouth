import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, setUserActive, getAllReservations } from '../firebase/dbService';
import toast from 'react-hot-toast';

function AdminUsers() {
  const { currentUser } = useAuth();
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toggling, setToggling]     = useState(null); // uid en proceso
  const [stats, setStats]           = useState({});
  const [search, setSearch]         = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [usersData, resData] = await Promise.all([
        getAllUsers(),
        getAllReservations()
      ]);
      setUsers(usersData);
      
      // Calcular estadísticas por usuario
      const userStats = {};
      for (const r of resData) {
        if (!userStats[r.userId]) {
          userStats[r.userId] = { pending: 0, confirmed: 0, cancelled: 0, attended: 0, absent: 0 };
        }
        if (r.status === 'pending') userStats[r.userId].pending++;
        if (r.status === 'confirmed') {
          userStats[r.userId].confirmed++;
          if (r.attended === true) userStats[r.userId].attended++;
          if (r.attended === false) userStats[r.userId].absent++;
        }
        if (r.status === 'cancelled') userStats[r.userId].cancelled++;
      }
      setStats(userStats);
    } catch {
      toast.error('Error al cargar usuarios y reservas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (user) => {
    // El admin no puede desactivarse a sí mismo
    if (user.uid === currentUser.uid) {
      toast.error('No puedes desactivar tu propia cuenta');
      return;
    }
    setToggling(user.uid);
    try {
      await setUserActive(user.uid, !user.isActive, currentUser.email);
      toast.success(
        user.isActive
          ? `🔒 ${user.displayName} desactivado`
          : `🔓 ${user.displayName} reactivado`
      );
      await load();
    } catch {
      toast.error('Error al cambiar el estado del usuario');
    } finally {
      setToggling(null);
    }
  };

  const filtered = users.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="admin-section-loading">Cargando usuarios...</div>;

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h3 className="section-title">Gestión de Usuarios</h3>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o correo..."
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="reservations-empty">
          <span className="empty-icon">👥</span>
          <p>No se encontraron usuarios.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Registrado</th>
                <th>Estadísticas (Horas)</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isSelf     = u.uid === currentUser.uid;
                const isToggling = toggling === u.uid;
                const createdAt  = u.createdAt?.toDate
                  ? format(u.createdAt.toDate(), "d MMM yyyy", { locale: es })
                  : '—';

                return (
                  <tr key={u.uid} className={!u.isActive ? 'row-inactive' : ''}>
                    <td>
                      <div className="table-user">
                        <span className="table-username">
                          {u.displayName}
                          {isSelf && <span className="self-badge">Tú</span>}
                        </span>
                        <span className="table-email">{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                        {u.role === 'admin' ? '⚙️ Admin' : '👤 Usuario'}
                      </span>
                    </td>
                    <td className="table-date">{createdAt}</td>
                    <td>
                      {stats[u.uid] ? (
                        <div style={{ fontSize: '12px', color: '#8b949e' }}>
                          <div>⏳ Pendientes: {stats[u.uid].pending}</div>
                          <div>✅ Confirmadas: {stats[u.uid].confirmed}</div>
                          <div>🏃 Asistencias: {stats[u.uid].attended}</div>
                          <div>❌ Inasistencias: {stats[u.uid].absent}</div>
                          <div>🚫 Canceladas: {stats[u.uid].cancelled}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#8b949e' }}>Sin historial</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${u.isActive ? 'status-confirmed' : 'status-cancelled'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`toggle-btn ${u.isActive ? 'toggle-deactivate' : 'toggle-activate'}`}
                        onClick={() => handleToggle(u)}
                        disabled={isSelf || isToggling}
                        title={isSelf ? 'No puedes modificar tu propia cuenta' : ''}
                      >
                        {isToggling ? '...' : u.isActive ? '🔒 Desactivar' : '🔓 Activar'}
                      </button>
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

export default AdminUsers;
