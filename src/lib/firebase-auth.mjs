import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = { apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0", authDomain: "diverty-eventos.firebaseapp.com", projectId: "diverty-eventos", storageBucket: "diverty-eventos.firebasestorage.app", messagingSenderId: "491130670516", appId: "1:491130670516:web:8c80abd09ccc92c194f6e1" };
export const app = getApps().some(item => item.name === '[DEFAULT]') ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const ADMIN_UID = 'OblqzhP2L3XulJ920O82jwd1Qrk1';
export const LOGO_URL = 'https://i.postimg.cc/GhFd4tcm/1000047880.png';
