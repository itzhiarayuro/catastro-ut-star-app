import { initializeApp, getApps } from 'firebase/app';
import {
    getFirestore,
    doc,
    onSnapshot,
    setDoc,
    enableIndexedDbPersistence,
    collection
} from 'firebase/firestore';
import { useState, useEffect } from 'react';

// For local development, using a generic config. 
// USER: Replace with your actual Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "catastro-ut-star.firebaseapp.com",
    projectId: "catastro-ut-star",
    storageBucket: "catastro-ut-star.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Enable Offline Persistence
if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support all of the features required to enable persistence');
        }
    });
}

export { db };

/**
 * Custom hook for Realtime Firestore Document Sync
 */
export function useFirestoreDoc(path: string) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        if (!path || path.includes('//')) return;

        const docRef = doc(db, path);
        const unsubscribe = onSnapshot(docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setData(docSnap.data());
                } else {
                    setData(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Firestore Listen Error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [path]);

    const saveData = async (newData: any) => {
        if (!path) return;
        try {
            const docRef = doc(db, path);
            // LocalStorage Backup as secondary failsafe
            localStorage.setItem(`backup_${path.replace(/\//g, '_')}`, JSON.stringify({
                ...newData,
                _backupTimestamp: new Date().toISOString()
            }));

            await setDoc(docRef, newData, { merge: true });
        } catch (err) {
            console.error("Firestore Save Error:", err);
            throw err;
        }
    };

    return { data, loading, error, saveData };
}
