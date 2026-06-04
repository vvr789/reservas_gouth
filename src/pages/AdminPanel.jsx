import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../firebase/authService';
import AdminReservations from '../components/AdminReservations';
import AdminUsers from '../components/AdminUsers';
import AdminAuditLog from '../components/AdminAuditLog';
import AdminSettings from '../components/AdminSettings';
import AdminAvailability from '../components/AdminAvailability';
import MetricsDashboard from '../components/MetricsDashboard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ClipboardList, Calendar, Users, FileText, Settings, Shield, User, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'metrics',      label: 'Métricas', Icon: BarChart2 },
  { id: 'reservations', label: 'Reservas', Icon: ClipboardList },
  { id: 'availability', label: 'Disponibilidad', Icon: Calendar },
  { id: 'users',        label: 'Usuarios', Icon: Users },
  { id: 'audit',        label: 'Bitácora', Icon: FileText },
  { id: 'settings',     label: 'Configuración', Icon: Settings },
];

function AdminPanel() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reservations');

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
    toast.success('Sesión cerrada. ¡Hasta pronto!');
  };

  return (
    <div className="dashboard-page admin">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="navbar admin-navbar">
        <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} />
          <span>Panel Admin — Sala de Ensayo</span>
        </div>
        <div className="navbar-user">
          <button className="btn-admin-link" onClick={() => navigate('/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <User size={16} />
            <span>Vista Usuario</span>
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
        {TABS.map(tab => {
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              id={`admin-tab-${tab.id}`}
              className={`tab-btn ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Contenido ───────────────────────────────────────────── */}
      <main className="dashboard-main">
        <ErrorBoundary>
          {activeTab === 'metrics'      && <MetricsDashboard />}
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
