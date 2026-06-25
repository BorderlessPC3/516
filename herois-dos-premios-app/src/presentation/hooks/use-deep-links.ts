import { firebaseAuth } from '@/services/firebase/firebase-client';

export function useDeepLinks(_onLink: (url: string) => void) {
  // Hook reservado para Linking.addEventListener em _layout
  return { auth: firebaseAuth };
}
