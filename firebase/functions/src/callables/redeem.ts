import { FIRESTORE_COLLECTIONS, SETTINGS_KEYS } from '@herois/shared';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { assertAuthenticated } from '../services/admin-guard';
import { debitCoins } from '../services/coins.service';
import { db } from '../config/firebase';

interface CoinRewardItem {
  id: string;
  name: string;
  description?: string;
  coinCost: number;
  isActive: boolean;
}

export const redeemCoins = onCall(async (request) => {
  const userId = await assertAuthenticated(request.auth?.uid);
  const { rewardId } = request.data as { rewardId: string };

  if (!rewardId) throw new HttpsError('invalid-argument', 'rewardId é obrigatório');

  const catalogSnap = await db
    .collection(FIRESTORE_COLLECTIONS.SETTINGS)
    .doc(SETTINGS_KEYS.COIN_REWARDS)
    .get();

  const catalog = catalogSnap.data()?.value as { rewards?: CoinRewardItem[] } | undefined;
  const reward = catalog?.rewards?.find((r) => r.id === rewardId && r.isActive);

  if (!reward) throw new HttpsError('not-found', 'Recompensa não encontrada ou inativa');

  const newBalance = await debitCoins(
    db,
    userId,
    reward.coinCost,
    `Resgate: ${reward.name}`,
  );

  return {
    success: true,
    rewardName: reward.name,
    coinCost: reward.coinCost,
    newBalance,
  };
});
