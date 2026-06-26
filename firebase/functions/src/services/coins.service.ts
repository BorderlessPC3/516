import {
  CoinTransactionType,
  FIRESTORE_COLLECTIONS,
  SETTINGS_KEYS,
} from '@herois/shared';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export interface CreditCoinsParams {
  userId: string;
  amount: number;
  type: CoinTransactionType;
  description: string;
  campaignId?: string;
  drawId?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export async function getCoinSettings(db: Firestore) {
  const snap = await db.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc(SETTINGS_KEYS.COIN_SETTINGS).get();
  if (snap.exists) return snap.data();
  const legacy = await db.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc(SETTINGS_KEYS.COIN_REWARD_AMOUNT).get();
  return {
    rewardAmount: legacy.exists ? Number(legacy.data()?.value ?? 1) : 1,
    requiredForReward: 1,
    expirationDays: 365,
    campaignBonus: 0,
    referralBonus: 5,
    socialActionBonus: 1,
  };
}

export async function creditCoins(db: Firestore, params: CreditCoinsParams): Promise<number> {
  const { userId, amount, type, description, campaignId, drawId, metadata, idempotencyKey } = params;

  if (amount <= 0) throw new Error('Valor de moedas deve ser positivo');

  if (idempotencyKey) {
    const existing = await db
      .collection(FIRESTORE_COLLECTIONS.COIN_TRANSACTIONS)
      .where('metadata.idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();
    if (!existing.empty) {
      return existing.docs[0].data().balanceAfter as number;
    }
  }

  const batch = db.batch();
  const walletQuery = await db
    .collection(FIRESTORE_COLLECTIONS.COINS)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  let walletRef;
  let newBalance: number;

  if (walletQuery.empty) {
    walletRef = db.collection(FIRESTORE_COLLECTIONS.COINS).doc();
    newBalance = amount;
    batch.set(walletRef, {
      userId,
      balance: amount,
      totalEarned: amount,
      totalSpent: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    walletRef = walletQuery.docs[0].ref;
    const currentBalance = walletQuery.docs[0].data().balance ?? 0;
    newBalance = currentBalance + amount;
    batch.update(walletRef, {
      balance: FieldValue.increment(amount),
      totalEarned: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  batch.update(db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId), {
    coinBalance: FieldValue.increment(amount),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const txRef = db.collection(FIRESTORE_COLLECTIONS.COIN_TRANSACTIONS).doc();
  batch.set(txRef, {
    userId,
    type,
    amount,
    balanceAfter: newBalance,
    campaignId,
    drawId,
    description,
    metadata: { ...metadata, idempotencyKey },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return newBalance;
}

export async function debitCoins(
  db: Firestore,
  userId: string,
  amount: number,
  description: string,
  drawId?: string,
): Promise<number> {
  if (amount <= 0) throw new Error('Valor inválido');

  const walletQuery = await db
    .collection(FIRESTORE_COLLECTIONS.COINS)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (walletQuery.empty) throw new Error('Saldo insuficiente');

  const walletData = walletQuery.docs[0].data();
  const currentBalance = walletData.balance ?? 0;
  if (currentBalance < amount) throw new Error('Saldo insuficiente');

  const newBalance = currentBalance - amount;
  const batch = db.batch();

  batch.update(walletQuery.docs[0].ref, {
    balance: FieldValue.increment(-amount),
    totalSpent: FieldValue.increment(amount),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.update(db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId), {
    coinBalance: FieldValue.increment(-amount),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const txRef = db.collection(FIRESTORE_COLLECTIONS.COIN_TRANSACTIONS).doc();
  batch.set(txRef, {
    userId,
    type: CoinTransactionType.SPENT,
    amount: -amount,
    balanceAfter: newBalance,
    drawId,
    description,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return newBalance;
}
