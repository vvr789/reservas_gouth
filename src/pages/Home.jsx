import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import MockCalendar from '../components/MockCalendar';
import { Music, Mic, Disc, Sliders, Volume2, Speaker, LogIn, LayoutDashboard, ChevronDown } from 'lucide-react';

export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleNavAction = () => {
    if (currentUser) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const internalServices = [
    {
      title: 'Arriendo Sala de Ensayo',
      price: '$8.000 por hora',
      desc: 'Ambiente tratado acústicamente con amplificadores a válvulas, batería profesional y microfonía de alta gama. El espacio definitivo para ensayar.',
      icon: Music,
      image: '/rehearsal_1.png'
    },
    {
      title: 'Grabación de Estudio',
      price: '$15.000 por hora',
      desc: 'Sala de control y tracking optimizadas. Captura tu sonido con ingenieros experimentados y equipamiento de alta fidelidad.',
      icon: Mic,
      image: '/rehearsal_2.png'
    },
    {
      title: 'Mezcla y Masterización',
      price: '$35.000 por track',
      desc: 'Edición, balance tonal y optimización de volumen final para cumplir con los estándares profesionales y distribución digital.',
      icon: Sliders,
      image: '/rehearsal_3.png'
    },
    {
      title: 'Grabación Multipista (Ensayos)',
      price: '$15.000 por sesión (2 hrs)',
      desc: 'Grabamos tu sesión completa por pistas independientes. Ideal para maquetas, análisis y preproducciones rápidas.',
      icon: Disc,
      image: '/rehearsal_4.png'
    }
  ];

  const externalServices = [
    {
      title: 'Operación FOH / Monitores',
      price: '$80.000 por jornada',
      desc: 'Ingeniero de mezcla dedicado a garantizar el sonido perfecto para tu banda en conciertos, teatros o festivales externos.',
      icon: Volume2,
      image: '/rehearsal_2.png' // re-use for consistency
    },
    {
      title: 'Arriendo de Amplificación (PA)',
      price: '$150.000 por jornada',
      desc: 'Sistemas de amplificación profesional para salas y exteriores. Sonido limpio, potente y adaptado a la envergadura del evento.',
      icon: Speaker,
      image: '/rehearsal_3.png' // re-use for consistency
    }
  ];

  return (
    <div className="landing-page">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="navbar landing-navbar">
        <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => scrollToSection('hero')}>
          <Music size={20} className="text-accent" />
          <span>El Rancho Estudio</span>
        </div>
        
        <div className="navbar-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button className="nav-link-btn" onClick={() => scrollToSection('servicios')}>Servicios</button>
          <button className="nav-link-btn" onClick={() => scrollToSection('calendario')}>Reservar Sala</button>
        </div>

        <div className="navbar-user">
          <button className="btn-navbar-action" onClick={handleNavAction} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {currentUser ? (
              <>
                <LayoutDashboard size={16} />
                <span>Mi Panel</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Acceder</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────── */}
      <header id="hero" className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">El Rancho Estudio</h1>
          <p className="hero-subtitle">
            El epicentro de tu creatividad sonora. Salas de ensayo de alto rendimiento, grabación profesional y arriendo de equipamiento en terreno. El espacio idóneo para moldear el sonido que tu música merece.
          </p>
          <div className="hero-actions">
            <button className="btn-primary hero-btn" onClick={() => scrollToSection('calendario')}>
              Reservar Sala de Ensayo
            </button>
            <button className="btn-outline hero-btn" onClick={() => scrollToSection('servicios')}>
              Conoce los Servicios
            </button>
          </div>
        </div>
        <button className="scroll-indicator" onClick={() => scrollToSection('servicios')} aria-label="Desplazar abajo">
          <ChevronDown size={24} />
        </button>
      </header>

      {/* ── Services Section ───────────────────────────────────── */}
      <section id="servicios" className="services-section">
        <div className="section-container">
          <h2 className="section-main-title">Con lo que contamos</h2>
          <p className="section-main-subtitle">
            Ofrecemos soluciones acústicas y técnicas avanzadas tanto en nuestro estudio como en exteriores para eventos en vivo.
          </p>

          <h3 className="category-title">Servicios en el Estudio (Internos)</h3>
          <div className="services-grid">
            {internalServices.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="service-card">
                  {s.image && (
                    <div className="service-card-image-wrapper">
                      <img src={s.image} alt={s.title} className="service-card-image" />
                    </div>
                  )}
                  <div className="service-card-content" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                      <div className="service-icon-box" style={{ marginBottom: 0 }}>
                        <Icon size={20} />
                      </div>
                      <h4 className="service-title" style={{ marginBottom: 0 }}>{s.title}</h4>
                    </div>
                    <div className="service-price">{s.price}</div>
                    <p className="service-desc">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="category-title" style={{ marginTop: '5rem' }}>Servicios en Terreno y Eventos (Externos)</h3>
          <div className="services-grid">
            {externalServices.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="service-card">
                  {s.image && (
                    <div className="service-card-image-wrapper">
                      <img src={s.image} alt={s.title} className="service-card-image" />
                    </div>
                  )}
                  <div className="service-card-content" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                      <div className="service-icon-box" style={{ marginBottom: 0 }}>
                        <Icon size={20} />
                      </div>
                      <h4 className="service-title" style={{ marginBottom: 0 }}>{s.title}</h4>
                    </div>
                    <div className="service-price">{s.price}</div>
                    <p className="service-desc">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Calendar Section ───────────────────────────────────── */}
      <section id="calendario" className="landing-calendar-section">
        <div className="section-container">
          <h2 className="section-main-title">Agenda tu Sesión</h2>
          <p className="section-main-subtitle" style={{ marginBottom: '3rem' }}>
            Planifica tus bloques de ensayo en tiempo real. El arriendo de la sala de ensayo tiene un valor de $8.000 la hora (se requiere un 25% de abono previo).
          </p>
          <div className="calendar-card-container">
            <MockCalendar />
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} El Rancho Estudio. Todos los derechos reservados.</p>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          La Serena, Chile &bull; Grabación, mezcla y salas de ensayo acústicamente calibradas.
        </p>
      </footer>
    </div>
  );
}
