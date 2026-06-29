import {
  CoinTransactionType,
  FIRESTORE_COLLECTIONS,
  SETTINGS_KEYS,
} from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { assertAuthenticated } from '../services/admin-guard';
import { db } from '../config/firebase';

interface ScratchPrize {
  id: string;
  name: string;
  description?: string;
  weight: number;
}

function pickWeightedPrize(prizes: ScratchPrize[]): ScratchPrize {
  const total = prizes.reduce((sum, p) => sum + (p.weight ?? 1), 0);
  let roll = Math.random() * total;
  for (const prize of prizes) {
    roll -= prize.weight ?? 1;
    if (roll <= 0) return prize;
  }
  return prizes[prizes.length - 1];
}

export const claimScratchCard = onCall(async (request) => {
  const userId = await assertAuthenticated(request.auth?.uid);

  const userRef = db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError('not-found', 'Usuário não encontrado');

  const user = userSnap.data()!;
  if (user.scratchCardClaimed) {
    throw new HttpsError('already-exists', 'Raspadinha já resgatada');
  }

  const settingsSnap = await db
    .collection(FIRESTORE_COLLECTIONS.SETTINGS)
    .doc(SETTINGS_KEYS.SCRATCH_CARD)
    .get();

  const settings = settingsSnap.data()?.value as {
    prizes?: ScratchPrize[];
    isActive?: boolean;
  } | undefined;

  if (!settings?.isActive || !settings.prizes?.length) {
    throw new HttpsError('failed-precondition', 'Raspadinha não disponível no momento');
  }

  const prize = pickWeightedPrize(settings.prizes);
  const claimRef = db.collection(FIRESTORE_COLLECTIONS.SCRATCH_CARD_CLAIMS).doc();

  const batch = db.batch();
  batch.set(claimRef, {
    userId,
    prizeId: prize.id,
    prizeName: prize.name,
    prizeDescription: prize.description ?? '',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(userRef, {
    scratchCardClaimed: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return {
    success: true,
    claimId: claimRef.id,
    prize: {
      id: prize.id,
      name: prize.name,
      description: prize.description,
    },
  };
});
