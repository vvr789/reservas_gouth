import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// 1. La pizarra vacía (el "canal" de comunicación)
const AuthContext = createContext(null);

// 2. El componente que envuelve toda la app y escribe en la pizarra
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);  // objeto de Firebase Auth
  const [userProfile, setUserProfile] = useState(null);   // datos de Firestore (rol, isActive)
  const [loading, setLoading] = useState(true);           // ¿estamos verificando aún?

  useEffect(() => {
    // Radar de Firebase: se dispara cada vez que alguien inicia o cierra sesión
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Hay sesión activa → buscamos el perfil en Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        setCurrentUser(firebaseUser);
        // Si el documento existe, usamos sus datos; si no, valores por defecto
        setUserProfile(userDocSnap.exists() ? userDocSnap.data() : { role: 'user', isActive: true });
      } else {
        // No hay sesión → limpiamos todo
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Limpieza: detener el radar cuando el componente se desmonta
    return unsubscribe;
  }, []);

  // Lo que ponemos a disposición de toda la app
  const value = {
    currentUser,              // objeto de Firebase Auth (email, uid, etc.)
    userProfile,              // objeto de Firestore (role, isActive, displayName)
    loading,
    isAdmin: userProfile?.role === 'admin',
    isActive: userProfile?.isActive !== false, // true por defecto si no existe el campo
  };

  // No renderizamos nada hasta saber si hay sesión o no
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 3. El atajo para leer la pizarra desde cualquier componente
export function useAuth() {
  return useContext(AuthContext);
}
