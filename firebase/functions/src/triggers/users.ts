import { CoinTransactionType, FIRESTORE_COLLECTIONS } from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

import { creditCoins, getCoinSettings } from '../services/coins.service';
import { db } from '../config/firebase';

export const onUserCreated = onDocumentCreated(
  `${FIRESTORE_COLLECTIONS.USERS}/{userId}`,
  async (event) => {
    const userId = event.params.userId;
    const data = event.data?.data();
    if (!data) return;

    const batch = db.batch();

    batch.set(db.collection(FIRESTORE_COLLECTIONS.COINS).doc(), {
      userId,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (data.referredBy) {
      const settings = await getCoinSettings(db);
      const bonus = settings.referralBonus ?? 5;
      await creditCoins(db, {
        userId: data.referredBy as string,
        amount: bonus,
        type: CoinTransactionType.BONUS,
        description: `Bônus por indicação de ${data.name}`,
        metadata: { referredUserId: userId },
        idempotencyKey: `referral_${userId}`,
      });
    }

    await batch.commit();
  },
);
