import { isFirebaseConfigured } from '@/services/firebase/client';

const FIRESTORE_TIMEOUT_MS = 8_000;

export class FirestoreUnavailableError extends Error {
  constructor(message = 'Firestore indisponível') {
    super(message);
    this.name = 'FirestoreUnavailableError';
  }
}

export async function withFirestore<T>(
  operation: () => Promise<T>,
  fallback: T,
  options?: { timeoutMs?: number },
): Promise<T> {
  if (!isFirebaseConfigured()) {
    return fallback;
  }

  const timeoutMs = options?.timeoutMs ?? FIRESTORE_TIMEOUT_MS;

  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new FirestoreUnavailableError('Tempo esgotado ao conectar ao Firestore')), timeoutMs),
      ),
    ]);
  } catch {
    return fallback;
  }
}
