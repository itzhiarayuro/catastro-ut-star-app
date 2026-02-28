import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    doc,
    onSnapshot,
    setDoc
} from 'firebase/firestore';
import React, { useState, useEffect, createContext, useContext } from 'react';

// Your web app's Firebase configuration - Extraído de Variables de Entorno y GitIgnore (.env.local)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});
const auth = getAuth(app);

interface AuthContextType {
    user: { email: string; name: string } | null;
    loading: boolean;
    isAuthorized: boolean;
    login: (email: string, pin: string) => Promise<any>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<{ email: string; name: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const userEmail = firebaseUser.email || '';
                const userName = firebaseUser.displayName || userEmail.split('@')[0];
                setUser({ email: userEmail, name: userName });
                setIsAuthorized(true);
            } else {
                setUser(null);
                setIsAuthorized(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async (email: string, pin: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, pin);
        } catch (error: any) {
            console.error("Error de Auth:", error.code, error.message);
            throw new Error(`Error: ${error.code}`);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setIsAuthorized(false);
        } catch (e) {
            console.error("Logout Fallido", e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAuthorized, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};

export { db, auth };

/**
 * Helper unificado para guardar una ficha en Firestore asegurando historial completo.
 * Escribe en dos colecciones:
 * 1. 'fichas': La versión más reciente de cada pozo (sobrescribe).
 * 2. 'historial_fichas': Un registro único de cada guardado con su timestamp (no se borra).
 */
export const persistFicha = async (ficha: any) => {
    if (!ficha.pozo || !ficha.municipio) return;

    const pozoId = ficha.pozo.replace(/\s+/g, '').toUpperCase();
    const mun = ficha.municipio.toUpperCase();

    // Ruta Maestra (Siempre la última versión)
    const masterPath = `fichas/${mun}_${pozoId}`;

    // Ruta Historial (ID Único con timestamp)
    const timestamp = Date.now();
    const historyPath = `historial_fichas/${mun}_${pozoId}_${timestamp}`;

    const dataToSave = {
        ...ficha,
        lastSync: new Date().toISOString()
    };

    // 1. Guardar en Master
    await setDoc(doc(db, masterPath), dataToSave, { merge: true });

    // 2. Guardar en Historial (Copia inmutable con ID de versión)
    await setDoc(doc(db, historyPath), {
        ...dataToSave,
        versionId: timestamp,
        tipoRegistro: 'HISTORIAL'
    });
};

export function useFirestoreDoc(path: string) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        if (!path || path.includes('//')) return;
        const docRef = doc(db, path);
        const unsubscribe = onSnapshot(docRef,
            (docSnap: any) => {
                setData(docSnap.exists() ? docSnap.data() : null);
                setLoading(false);
            },
            (err: any) => {
                setError(err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [path]);

    const saveData = async (newData: any) => {
        if (!path) return;
        // Backup local extra por seguridad
        localStorage.setItem(`backup_${path.replace(/\//g, '_')}`, JSON.stringify(newData));

        // Usamos el persistFicha que maneja master + historial
        await persistFicha(newData);
    };

    return { data, loading, error, saveData };
}
