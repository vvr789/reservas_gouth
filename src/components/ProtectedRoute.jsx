import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guardia de seguridad para rutas.
 * Props:
 *   - children: la página a proteger
 *   - adminOnly: si es true, solo el admin puede entrar (default: false)
 */
function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, isAdmin } = useAuth();

  // Sin sesión → a la página de login
  if (!currentUser) return <Navigate to="/login" replace />;

  // Ruta de admin pero el usuario no es admin → al dashboard normal
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;

  // Todo bien → mostrar la página
  return children;
}

export default ProtectedRoute;
