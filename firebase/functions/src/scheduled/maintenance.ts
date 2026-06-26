import { onSchedule } from 'firebase-functions/v2/scheduler';

import { expireCoupons } from '../services/coupon.service';
import { db } from '../config/firebase';
import { FIRESTORE_COLLECTIONS } from '@herois/shared';

export const expireCouponsDaily = onSchedule('every 24 hours', async () => {
  const expired = await expireCoupons(db);
  console.info(`Expired ${expired} coupons`);
});

export const notifyExpiringCoupons = onSchedule('every 12 hours', async () => {
  const in3days = new Date();
  in3days.setDate(in3days.getDate() + 3);
  const now = new Date();

  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.COUPONS)
    .where('status', '==', 'ACTIVE')
    .where('validUntil', '<=', in3days.toISOString())
    .where('validUntil', '>', now.toISOString())
    .limit(100)
    .get();

  const { admin } = await import('../config/firebase');
  const { sendPushToUsers } = await import('../services/push.service');

  for (const doc of snap.docs) {
    const data = doc.data();
    const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(data.userId as string).get();
    if (!userDoc.exists) continue;
    const tokens = (userDoc.data()?.fcmTokens as string[]) ?? [];
    if (!tokens.length) continue;

    await sendPushToUsers(
      admin.messaging(),
      [{ id: data.userId as string, fcmTokens: tokens }],
      'Cupom expirando em breve',
      `Seu cupom ${data.code} expira em breve. Use antes que acabe!`,
      { couponId: doc.id, type: 'COUPON_EXPIRING' },
    );
  }
});
