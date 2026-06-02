import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../firebase/authService';
import Calendar from '../components/Calendar';
import MyReservations from '../components/MyReservations';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'calendar',     label: '📅 Reservar hora' },
  { id: 'my-reservations', label: '🗂 Mis reservas' },
];

function UserDashboard() {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('calendar');

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
    toast('Sesión cerrada. ¡Hasta pronto! 👋', { icon: '🔒' });
  };

  return (
    <div className="dashboard-page">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-brand">🎸 Sala de Ensayo</div>
        <div className="navbar-user">
          {isAdmin && (
            <button className="btn-admin-link" onClick={() => navigate('/admin')}>
              Panel Admin ⚙️
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
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`tab-btn ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Contenido ───────────────────────────────────────────── */}
      <main className="dashboard-main">
        {activeTab === 'calendar'        && <Calendar />}
        {activeTab === 'my-reservations' && <MyReservations />}
      </main>
    </div>
  );
}

export default UserDashboard;
