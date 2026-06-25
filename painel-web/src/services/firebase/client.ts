import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const FIREBASE_CONFIG_ERROR =
  'Firebase não configurado. Copie painel-web/.env.example para painel-web/.env.local, preencha NEXT_PUBLIC_FIREBASE_* com os dados do app Web no Firebase Console e reinicie npm run dev.';

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain);
}

let app: FirebaseApp | undefined;

function getApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase só pode ser usado no navegador.');
  }

  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_CONFIG_ERROR);
  }

  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
  }

  return app;
}

function createLazyService<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = resolve();
      const value = Reflect.get(instance, prop, instance);
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  });
}

let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;
let functionsInstance: Functions | undefined;

export const firebaseApp = createLazyService(() => getApp());

export const auth = createLazyService<Auth>(() => {
  if (!authInstance) authInstance = getAuth(getApp());
  return authInstance;
});

export const db = createLazyService<Firestore>(() => {
  if (!dbInstance) dbInstance = getFirestore(getApp());
  return dbInstance;
});

export const storage = createLazyService<FirebaseStorage>(() => {
  if (!storageInstance) storageInstance = getStorage(getApp());
  return storageInstance;
});

export const functions = createLazyService<Functions>(() => {
  if (!functionsInstance) functionsInstance = getFunctions(getApp());
  return functionsInstance;
});
