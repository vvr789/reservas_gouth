import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../firebase/authService';
import AdminReservations from '../components/AdminReservations';
import AdminUsers from '../components/AdminUsers';
import AdminAuditLog from '../components/AdminAuditLog';
import AdminSettings from '../components/AdminSettings';
import AdminAvailability from '../components/AdminAvailability';
import { ErrorBoundary } from '../components/ErrorBoundary';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'reservations', label: '📋 Reservas' },
  { id: 'availability', label: '🗓️ Disponibilidad' },
  { id: 'users',        label: '👥 Usuarios' },
  { id: 'audit',        label: '📝 Bitácora' },
  { id: 'settings',     label: '⚙️ Configuración' },
];

function AdminPanel() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reservations');

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
    toast('Sesión cerrada. ¡Hasta pronto! 👋', { icon: '🔒' });
  };

  return (
    <div className="dashboard-page admin">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="navbar admin-navbar">
        <div className="navbar-brand">⚙️ Panel Admin — Sala de Ensayo</div>
        <div className="navbar-user">
          <button className="btn-admin-link" onClick={() => navigate('/dashboard')}>
            Vista Usuario 🎸
          </button>
          <span className="navbar-badge">ADMIN</span>
          <span className="navbar-name">
            {userProfile?.displayName ?? currentUser.email}
          </span>
          <button className="btn-logout" onClick={handleLogout}>Salir</button>
        </div>
      </nav>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="tabs-container">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`admin-tab-${tab.id}`}
            className={`tab-btn ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Contenido ───────────────────────────────────────────── */}
      <main className="dashboard-main">
        <ErrorBoundary>
          {activeTab === 'reservations' && <AdminReservations />}
          {activeTab === 'availability' && <AdminAvailability />}
          {activeTab === 'users'        && <AdminUsers />}
          {activeTab === 'audit'        && <AdminAuditLog />}
          {activeTab === 'settings'     && <AdminSettings />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default AdminPanel;
