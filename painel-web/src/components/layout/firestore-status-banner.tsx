'use client';

import { isDevAuthEnabled } from '@/lib/dev-auth';
import { isFirebaseConfigured } from '@/services/firebase/client';

export function FirestoreStatusBanner() {
  if (!isDevAuthEnabled() && isFirebaseConfigured()) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-400">
      {!isFirebaseConfigured()
        ? 'Firebase não configurado — dados salvos apenas localmente onde disponível.'
        : 'Modo desenvolvimento: Firestore/Functions podem estar indisponíveis. Listagens podem aparecer vazias.'}
    </div>
  );
}
