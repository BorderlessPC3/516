import {
  CampaignStatus,
  CouponStatus,
  FIRESTORE_COLLECTIONS,
  PushEventType,
  toDate,
} from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { admin, db } from '../config/firebase';
import { expireCoupons } from '../services/coupon.service';
import { getCoinSettings } from '../services/coins.service';
import { sendPushToUsers } from '../services/push.service';

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
    .where('status', '==', CouponStatus.ACTIVE)
    .where('validUntil', '<=', in3days.toISOString())
    .where('validUntil', '>', now.toISOString())
    .limit(100)
    .get();

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
      { couponId: doc.id, type: PushEventType.COUPON_EXPIRING },
    );
  }
});

export const endExpiredCampaigns = onSchedule('every 6 hours', async () => {
  const now = new Date().toISOString();
  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.CAMPAIGNS)
    .where('status', 'in', [CampaignStatus.ACTIVE, CampaignStatus.SCHEDULED, CampaignStatus.PAUSED])
    .where('endDate', '<', now)
    .limit(100)
    .get();

  for (const doc of snap.docs) {
    await doc.ref.update({
      status: CampaignStatus.ENDED,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const couponsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.COUPONS)
      .where('campaignId', '==', doc.id)
      .where('status', '==', CouponStatus.ACTIVE)
      .limit(500)
      .get();

    if (!couponsSnap.empty) {
      const batch = db.batch();
      couponsSnap.docs.forEach((c) => {
        batch.update(c.ref, {
          status: CouponStatus.EXPIRED,
          isActive: false,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }
  }

  console.info(`Ended ${snap.size} expired campaigns`);
});

export const sendVideoReminderPushes = onSchedule('every 24 hours', async () => {
  const coinSettings = await getCoinSettings(db);
  const requiredForReward = (coinSettings.requiredForReward as number) ?? 15;

  const usersSnap = await db
    .collection(FIRESTORE_COLLECTIONS.USERS)
    .where('isActive', '==', true)
    .where('videosWatched', '>', 0)
    .limit(500)
    .get();

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const videosWatched = (data.videosWatched as number) ?? 0;
    const remainder = videosWatched % requiredForReward;
    if (remainder === 0) continue;

    const remaining = requiredForReward - remainder;
    const tokens = (data.fcmTokens as string[]) ?? [];
    if (!tokens.length) continue;

    await sendPushToUsers(
      admin.messaging(),
      [{ id: userDoc.id, fcmTokens: tokens }],
      'Continue assistindo!',
      `Faltam ${remaining} vídeo${remaining > 1 ? 's' : ''} para ganhar sua moeda.`,
      { type: PushEventType.VIDEOS_REMAINING, remaining: String(remaining) },
    );
  }
});

export const sendInactiveVideoPushes = onSchedule('every 48 hours', async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const usersSnap = await db
    .collection(FIRESTORE_COLLECTIONS.USERS)
    .where('isActive', '==', true)
    .limit(500)
    .get();

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const videosWatched = (data.videosWatched as number) ?? 0;
    const lastLogin = data.lastLoginAt ? toDate(data.lastLoginAt as string) : null;

    if (videosWatched >= 5) continue;
    if (lastLogin && lastLogin > cutoff) continue;

    const tokens = (data.fcmTokens as string[]) ?? [];
    if (!tokens.length) continue;

    await sendPushToUsers(
      admin.messaging(),
      [{ id: userDoc.id, fcmTokens: tokens }],
      'Você está perdendo prêmios!',
      videosWatched === 0
        ? 'Assista seus primeiros vídeos e comece a ganhar moedas.'
        : `Você assistiu apenas ${videosWatched} vídeo${videosWatched > 1 ? 's' : ''}. Volte e continue!`,
      { type: PushEventType.VIDEOS_REMAINING },
    );
  }
});
