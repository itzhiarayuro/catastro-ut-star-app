import { initializeApp, getApps } from 'firebase/app';
import {
    getFirestore,
    doc,
    onSnapshot,
    setDoc,
    enableIndexedDbPersistence
} from 'firebase/firestore';
import React, { useState, useEffect, createContext, useContext } from 'react';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyClaOKQqLG6-KBNcVaAD_QYlBjeKyP3i2c",
    authDomain: "catastro-ut-star.firebaseapp.com",
    projectId: "catastro-ut-star",
    storageBucket: "catastro-ut-star.firebasestorage.app",
    messagingSenderId: "691178303694",
    appId: "1:691178303694:web:778ae824c94020f990209f"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const AUTHORIZED_USERS = [
    { email: "juanvegas003@gmail.com", pin: "1234", name: "Juan Vega" },
    { email: "juan.vega.icya@gmail.com", pin: "5701", name: "Juan Vega ICYA" },
    { email: "mariangelsp.icya@gmail.com", pin: "5702", name: "Mariangel" },
    { email: "samara.icya@gmail.com", pin: "5703", name: "Samara" },
    { email: "darly.icya@gmail.com", pin: "1234", name: "Darly" }
];

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
        const savedUser = localStorage.getItem('ut_star_user');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                setUser(parsed);
                setIsAuthorized(true);
            } catch (e) {
                localStorage.removeItem('ut_star_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email: string, pin: string) => {
        const found = AUTHORIZED_USERS.find(u =>
            u.email.toLowerCase() === email.toLowerCase() && u.pin === pin
        );

        if (found) {
            const userData = { email: found.email, name: found.name };
            localStorage.setItem('ut_star_user', JSON.stringify(userData));
            setUser(userData);
            setIsAuthorized(true);
            return userData;
        } else {
            throw new Error("Credenciales inválidas.");
        }
    };

    const logout = () => {
        localStorage.removeItem('ut_star_user');
        setUser(null);
        setIsAuthorized(false);
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

export { db };

if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err: any) => {
        if (err.code === 'failed-precondition') {
            console.warn('Persistence already enabled in another tab.');
        }
    });
}

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
        const docRef = doc(db, path);
        localStorage.setItem(`backup_${path.replace(/\//g, '_')}`, JSON.stringify(newData));
        await setDoc(docRef, newData, { merge: true });
    };

    return { data, loading, error, saveData };
}
