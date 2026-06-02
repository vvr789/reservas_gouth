// Importamos las herramientas principales de Firebase
import { initializeApp } from "firebase/app";
// Importamos el guardián de las sesiones (Auth)
import { getAuth } from "firebase/auth";
// Importamos tu Base de Datos JSON (Firestore)
import { getFirestore } from "firebase/firestore";

// Tu configuración pública de Firebase web (El pasaporte de tu app)
const firebaseConfig = {
  apiKey: "AIzaSyBUaxmtDZbNv4oUzCKZY6Sokckekqpmt1A",
  authDomain: "viteyfirebase.firebaseapp.com",
  projectId: "viteyfirebase",
  storageBucket: "viteyfirebase.firebasestorage.app",
  messagingSenderId: "1005555790343",
  appId: "1:1005555790343:web:2bcf1fd06c597e8445b0a2",
  measurementId: "G-JSGXZQ2M8Q"
};

// 1. Inicializamos/Despertamos la conexión con Firebase
const app = initializeApp(firebaseConfig);

// 2. Extraemos las herramientas de Auth y Base de datos de esa conexión
// y las EXPORTAMOS, para que cualquier vista (componente) de React pueda usarlas
export const auth = getAuth(app);
export const db = getFirestore(app);
