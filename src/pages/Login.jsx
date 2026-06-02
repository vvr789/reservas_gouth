import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../firebase/authService';
import { Music } from 'lucide-react';
import toast from 'react-hot-toast';

const SLIDES = [
  {
    url: '/rehearsal_1.png',
    title: 'Sonido Profesional',
    subtitle: 'Salas totalmente equipadas y tratadas acústicamente para tu banda.'
  },
  {
    url: '/rehearsal_2.png',
    title: 'Equipamiento de Alta Gama',
    subtitle: 'Amplificadores valvulares, baterías premium y microfonía profesional.'
  },
  {
    url: '/rehearsal_3.png',
    title: 'Reserva de Horas Fácil',
    subtitle: 'Gestiona tus ensayos de forma instantánea desde cualquier dispositivo.'
  },
  {
    url: '/rehearsal_4.png',
    title: 'Espacio de Creación',
    subtitle: 'El ambiente ideal diseñado específicamente para inspirar tu música.'
  }
];

function Login() {
  const [loading, setLoading] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const navigate = useNavigate();

  // Rotar imágenes cada 18 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, 18000);
    return () => clearInterval(timer);
  }, []);

  // ── Google Sign-In ──────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error('Error al iniciar con Google. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-content">
          <div className="auth-logo">
            <Music size={48} strokeWidth={1.5} />
          </div>
          <h1 className="auth-title">Sala de Ensayo</h1>
          <p className="auth-subtitle">Inicia sesión para reservar tu hora</p>

          <button
            id="btn-google-login"
            className="btn-google"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {/* SVG oficial de Google */}
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'Conectando...' : 'Continuar con Google'}
          </button>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
                textDecoration: 'underline',
                fontFamily: 'inherit',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            >
              Volver a la página principal
            </button>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="slideshow-container">
          {SLIDES.map((slide, idx) => (
            <img
              key={idx}
              src={slide.url}
              alt={slide.title}
              className={`slide-img ${idx === slideIndex ? 'active' : ''}`}
            />
          ))}
        </div>
        <div className="slideshow-overlay" />
        <div className="auth-right-overlay-text">
          <h2 className="auth-right-title">{SLIDES[slideIndex].title}</h2>
          <p className="auth-right-subtitle">{SLIDES[slideIndex].subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
