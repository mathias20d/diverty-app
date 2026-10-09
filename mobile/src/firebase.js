import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
const app = initializeApp({ apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0", authDomain: "diverty-eventos.firebaseapp.com", projectId: "diverty-eventos", storageBucket: "diverty-eventos.firebasestorage.app", messagingSenderId: "491130670516", appId: "1:491130670516:web:8c80abd09ccc92c194f6e1" });
export const auth = initializeAuth(app, { persistence:getReactNativePersistence(AsyncStorage) });
export const db = getFirestore(app);
export const ADMIN_UID = 'OblqzhP2L3XulJ920O82jwd1Qrk1';
export const DATA_PATH = ['artifacts','diverty-oficial','public','data'];
