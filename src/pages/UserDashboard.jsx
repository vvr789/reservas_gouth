import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../firebase/authService';
import CalendarComponent from '../components/Calendar';
import MyReservations from '../components/MyReservations';
import { Calendar as CalendarIcon, Folder, Music, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'calendar', label: 'Reservar hora', Icon: CalendarIcon },
  { id: 'my-reservations', label: 'Mis reservas', Icon: Folder },
];

function UserDashboard() {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('calendar');

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
    toast.success('Sesión cerrada. ¡Hasta pronto!');
  };

  return (
    <div className="dashboard-page">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Music size={20} />
          <span>Sala de Ensayo</span>
        </div>
        <div className="navbar-user">
          {isAdmin && (
            <button className="btn-admin-link" onClick={() => navigate('/admin')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={16} />
              <span>Panel Admin</span>
            </button>
          )}
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
              id={`tab-${tab.id}`}
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
        {activeTab === 'calendar'        && <CalendarComponent />}
        {activeTab === 'my-reservations' && <MyReservations />}
      </main>
    </div>
  );
}

export default UserDashboard;
