import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inicializa o Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Cria uma credencial de autenticação para um cliente sem deslogar o administrador atual.
 * Utiliza uma instância secundária em memória temporária para registrar o usuário.
 * 
 * @param email Email do cliente
 * @param pass Senha do cliente
 * @returns O UID criado para o cliente no Firebase Auth
 */
export async function createNewUserAuth(email: string, pass: string): Promise<string> {
  const tempAppName = `temp-admin-create-${Date.now()}`;
  
  // Inicializa um app secundário temporário
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(tempAuth, email, pass);
    const uid = userCredential.user.uid;
    
    // Desloga da instância temporária para manter tudo limpo
    await tempAuth.signOut();
    return uid;
  } catch (error) {
    console.error('Erro na instância temporária de criação de usuário:', error);
    throw error;
  } finally {
    // Exclui a instância temporária do app para liberar memória
    await deleteApp(tempApp);
  }
}
