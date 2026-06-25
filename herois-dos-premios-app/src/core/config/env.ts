export const env = {
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  },
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  appScheme: 'heroisdospremios',
  universalLinkDomain: 'heroisdospremios.com.br',
} as const;

export function validateEnv(): void {
  const required = ['apiKey', 'projectId', 'authDomain'] as const;
  for (const key of required) {
    if (!env.firebase[key]) {
      console.warn(`[ENV] EXPO_PUBLIC_FIREBASE_${key.toUpperCase()} não configurado`);
    }
  }
}

export const isDev = __DEV__;
