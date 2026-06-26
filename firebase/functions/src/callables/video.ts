import {
  CoinTransactionType,
  FIRESTORE_COLLECTIONS,
  VIDEO_COMPLETION_THRESHOLD,
  VideoProcessingStatus,
} from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { assertAuthenticated } from '../services/admin-guard';
import { creditCoins, getCoinSettings } from '../services/coins.service';
import { generateCouponForUser } from '../services/coupon.service';
import { db } from '../config/firebase';

async function getCampaignVideos(campaignId: string) {
  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS)
    .where('campaignId', '==', campaignId)
    .where('processingStatus', '==', VideoProcessingStatus.READY)
    .get();

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0));
}

async function countCompletedVideos(userId: string, campaignId: string, videoIds: string[]) {
  let completed = 0;
  for (const videoId of videoIds) {
    const progressId = `${userId}_${campaignId}_${videoId}`;
    const snap = await db.collection(FIRESTORE_COLLECTIONS.VIDEO_PROGRESS).doc(progressId).get();
    if (snap.exists && snap.data()?.isCompleted) completed++;
  }
  return completed;
}

export const onVideoCompleted = onCall(async (request) => {
  const userId = await assertAuthenticated(request.auth?.uid);

  const { campaignId, videoId, watchedSeconds, watchedPercent } = request.data as {
    campaignId: string;
    videoId: string;
    watchedSeconds: number;
    watchedPercent: number;
  };

  if (!campaignId || !videoId) {
    throw new HttpsError('invalid-argument', 'campaignId e videoId são obrigatórios');
  }

  if (watchedPercent < VIDEO_COMPLETION_THRESHOLD) {
    throw new HttpsError('failed-precondition', 'Vídeo não foi assistido até o mínimo exigido');
  }

  const idempotencyKey = `video_${userId}_${campaignId}_${videoId}`;
  const existingView = await db
    .collection(FIRESTORE_COLLECTIONS.VIDEO_VIEWS)
    .where('userId', '==', userId)
    .where('videoId', '==', videoId)
    .limit(1)
    .get();

  if (!existingView.empty) {
    return { success: true, alreadyCompleted: true, coinsEarned: 0 };
  }

  const progressId = `${userId}_${campaignId}_${videoId}`;
  await db.collection(FIRESTORE_COLLECTIONS.VIDEO_PROGRESS).doc(progressId).set(
    {
      userId,
      campaignId,
      videoId,
      currentTimeSeconds: watchedSeconds,
      watchedPercent,
      isCompleted: true,
      completedAt: FieldValue.serverTimestamp(),
      lastWatchedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const batch = db.batch();
  const viewRef = db.collection(FIRESTORE_COLLECTIONS.VIDEO_VIEWS).doc();
  batch.set(viewRef, {
    userId,
    campaignId,
    videoId,
    watchedSeconds,
    watchedPercent,
    completedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.update(db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId), {
    videosWatched: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  const videos = await getCampaignVideos(campaignId);
  const videoIds = videos.length > 0 ? videos.map((v) => v.id) : [videoId];
  const completedCount = await countCompletedVideos(userId, campaignId, videoIds);
  const campaignCompleted = completedCount >= videoIds.length;

  const participationId = `${userId}_${campaignId}`;
  await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGN_PARTICIPATIONS).doc(participationId).set(
    {
      videosCompleted: completedCount,
      totalVideos: videoIds.length,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  let coinsEarned = 0;
  let couponId: string | undefined;
  let newBalance = 0;

  if (campaignCompleted) {
    const participationSnap = await db
      .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_PARTICIPATIONS)
      .doc(participationId)
      .get();
    if (participationSnap.exists && participationSnap.data()?.isCompleted) {
      return { success: true, alreadyCompleted: true, campaignCompleted: true, coinsEarned: 0 };
    }

    const campaignSnap = await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(campaignId).get();
    const campaign = campaignSnap.data() ?? {};
    const coinSettings = await getCoinSettings(db);
    const reward = (campaign.coinReward as number) ?? coinSettings.rewardAmount ?? 1;

    await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(campaignId).update({
      viewCount: FieldValue.increment(1),
      conversionCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    newBalance = await creditCoins(db, {
      userId,
      amount: reward,
      type: CoinTransactionType.EARNED,
      description: 'Moedas ganhas por completar campanha',
      campaignId,
      idempotencyKey: `campaign_${userId}_${campaignId}`,
    });
    coinsEarned = reward;

    const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId).get();
    const userData = userSnap.data() ?? {};

    couponId = await generateCouponForUser(db, {
      userId,
      campaignId,
      campaignName: campaign.name as string,
      userName: userData.name as string,
      userPhone: userData.phone as string,
      createdBy: 'system',
    });

    await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGN_PARTICIPATIONS).doc(participationId).set(
      {
        isCompleted: true,
        completedAt: FieldValue.serverTimestamp(),
        coinsEarned: reward,
        couponId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId).update({
      completedCampaignIds: FieldValue.arrayUnion(campaignId),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await db.collection(FIRESTORE_COLLECTIONS.ANALYTICS_EVENTS).add({
    type: 'VIDEO_COMPLETED',
    userId,
    campaignId,
    videoId,
    metadata: { watchedSeconds, watchedPercent, campaignCompleted },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    coinsEarned,
    newBalance,
    campaignCompleted,
    couponId,
    videosCompleted: completedCount,
    totalVideos: videoIds.length,
  };
});

export const trackVideoAnalytics = onCall(async (request) => {
  const userId = await assertAuthenticated(request.auth?.uid);
  const { event, campaignId, videoId, metadata } = request.data as {
    event: string;
    campaignId?: string;
    videoId?: string;
    metadata?: Record<string, unknown>;
  };

  await db.collection(FIRESTORE_COLLECTIONS.ANALYTICS_EVENTS).add({
    type: event,
    userId,
    campaignId,
    videoId,
    metadata,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
