import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AdminPanel from './pages/AdminPanel';

/**
 * App.jsx — El Director de Orquesta
 *
 * Aquí ocurren dos cosas importantes:
 * 1. <AuthProvider> envuelve TODA la app para que cualquier componente
 *    pueda leer la pizarra global (usuario, rol, estado).
 * 2. <Routes> define qué página se muestra según la URL del navegador.
 */
function App() {
  return (
    <AuthProvider>
      {/* Toaster: el contenedor invisible que pinta las notificaciones en pantalla */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e2433',
            color: '#e6edf3',
            border: '1px solid #30363d',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
          },
          success: { iconTheme: { primary: '#3fb950', secondary: '#0d1117' } },
          error:   { iconTheme: { primary: '#f85149', secondary: '#0d1117' } },
        }}
      />

      <BrowserRouter>
        <Routes>
          {/* Ruta raíz → redirige a /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rutas públicas: cualquiera puede acceder */}
          <Route path="/login"    element={<Login />} />

          {/* Ruta protegida: solo usuarios logueados */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* Ruta protegida: solo el administrador */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Cualquier URL desconocida → a login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
