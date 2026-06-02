import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

/**
 * authService.js
 * Centraliza toda la lógica de autenticación.
 * Los componentes no hablan directamente con Firebase Auth,
 * siempre pasan por aquí.
 */

/**
 * Inicia sesión con Google (popup).
 * Si el usuario es nuevo, crea su perfil en Firestore automáticamente.
 * Si ya existe, no sobreescribe su rol ni su estado activo.
 */
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  // Revisamos si ya tiene perfil en Firestore
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      // Primera vez con Google → crear perfil
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'user',
        isActive: true,
        createdAt: serverTimestamp(),
      });
    }
  } catch (firestoreError) {
    console.warn('No se pudo leer/crear el perfil en Firestore:', firestoreError.message);
  }

  return user;
}

/**
 * Cierra la sesión del usuario actual.
 */
export async function logoutUser() {
  await signOut(auth);
}
