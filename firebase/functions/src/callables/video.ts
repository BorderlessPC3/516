import {
  CoinTransactionType,
  FIRESTORE_COLLECTIONS,
  VIDEO_COMPLETION_THRESHOLD,
} from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { assertAuthenticated } from '../services/admin-guard';
import { creditCoins, getCoinSettings } from '../services/coins.service';
import { generateCouponForUser } from '../services/coupon.service';
import { getCampaignSponsorSteps } from '../services/sponsor.service';
import { db } from '../config/firebase';

export const onVideoCompleted = onCall(async (request) => {
  const userId = await assertAuthenticated(request.auth?.uid);

  const { campaignId, videoId, sponsorId, watchedSeconds, watchedPercent } = request.data as {
    campaignId: string;
    videoId: string;
    sponsorId?: string;
    watchedSeconds: number;
    watchedPercent: number;
  };

  if (!campaignId || !videoId) {
    throw new HttpsError('invalid-argument', 'campaignId e videoId são obrigatórios');
  }

  if (watchedPercent < VIDEO_COMPLETION_THRESHOLD) {
    throw new HttpsError('failed-precondition', 'Vídeo não foi assistido até o mínimo exigido');
  }

  const existingView = await db
    .collection(FIRESTORE_COLLECTIONS.VIDEO_VIEWS)
    .where('userId', '==', userId)
    .where('videoId', '==', videoId)
    .limit(1)
    .get();

  if (!existingView.empty) {
    const participationId = `${userId}_${campaignId}`;
    const partSnap = await db
      .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_PARTICIPATIONS)
      .doc(participationId)
      .get();
    return {
      success: true,
      alreadyCompleted: true,
      coinsEarned: 0,
      currentStepIndex: partSnap.data()?.currentStepIndex ?? 0,
      campaignCompleted: partSnap.data()?.isCompleted ?? false,
    };
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

  const userRef = db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId);
  const userSnapBefore = await userRef.get();
  const videosWatchedBefore = (userSnapBefore.data()?.videosWatched as number) ?? 0;

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

  batch.update(userRef, {
    videosWatched: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  const sponsorSteps = await getCampaignSponsorSteps(db, campaignId);
  const totalSteps = sponsorSteps.length || 1;

  let completedSponsorIds: string[] = [];
  if (sponsorId) {
    const participationId = `${userId}_${campaignId}`;
    const partSnap = await db
      .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_PARTICIPATIONS)
      .doc(participationId)
      .get();
    const existing = (partSnap.data()?.completedSponsorIds as string[]) ?? [];
    if (!existing.includes(sponsorId)) {
      completedSponsorIds = [...existing, sponsorId];
    } else {
      completedSponsorIds = existing;
    }
  }

  const completedCount = sponsorId
    ? completedSponsorIds.length
    : Math.min(totalSteps, videosWatchedBefore + 1);

  const currentStepIndex = sponsorId
    ? sponsorSteps.findIndex((s) => s.sponsorId === sponsorId) + 1
    : completedCount;

  const campaignCompleted = completedCount >= totalSteps;
  const participationId = `${userId}_${campaignId}`;

  await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGN_PARTICIPATIONS).doc(participationId).set(
    {
      userId,
      campaignId,
      videosCompleted: completedCount,
      totalVideos: totalSteps,
      currentStepIndex,
      completedSponsorIds,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const coinSettings = await getCoinSettings(db);
  const requiredForReward = (coinSettings.requiredForReward as number) ?? 15;
  const rewardAmount = (coinSettings.rewardAmount as number) ?? 1;
  const newVideosWatched = videosWatchedBefore + 1;

  let coinsEarned = 0;
  let newBalance = 0;
  let couponId: string | undefined;

  if (newVideosWatched > 0 && newVideosWatched % requiredForReward === 0) {
    const milestone = newVideosWatched / requiredForReward;
    newBalance = await creditCoins(db, {
      userId,
      amount: rewardAmount,
      type: CoinTransactionType.EARNED,
      description: `Moeda por assistir ${requiredForReward} vídeos`,
      campaignId,
      idempotencyKey: `coin_milestone_${userId}_${milestone}`,
    });
    coinsEarned += rewardAmount;
  }

  if (campaignCompleted) {
    const participationSnap = await db
      .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_PARTICIPATIONS)
      .doc(participationId)
      .get();
    if (participationSnap.exists && participationSnap.data()?.isCompleted) {
      return {
        success: true,
        alreadyCompleted: true,
        campaignCompleted: true,
        coinsEarned,
        newBalance,
        currentStepIndex,
        videosCompleted: completedCount,
        totalVideos: totalSteps,
      };
    }

    const campaignSnap = await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(campaignId).get();
    const campaign = campaignSnap.data() ?? {};
    const campaignReward = (campaign.coinReward as number) ?? 0;

    await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(campaignId).update({
      viewCount: FieldValue.increment(1),
      conversionCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (campaignReward > 0) {
      newBalance = await creditCoins(db, {
        userId,
        amount: campaignReward,
        type: CoinTransactionType.BONUS,
        description: 'Bônus por completar campanha',
        campaignId,
        idempotencyKey: `campaign_${userId}_${campaignId}`,
      });
      coinsEarned += campaignReward;
    }

    const userData = (await userRef.get()).data() ?? {};
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
        coinsEarned: campaignReward,
        couponId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await userRef.update({
      completedCampaignIds: FieldValue.arrayUnion(campaignId),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await db.collection(FIRESTORE_COLLECTIONS.ANALYTICS_EVENTS).add({
    type: 'VIDEO_COMPLETED',
    userId,
    campaignId,
    videoId,
    metadata: { watchedSeconds, watchedPercent, campaignCompleted, sponsorId },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    coinsEarned,
    newBalance,
    campaignCompleted,
    couponId,
    currentStepIndex,
    videosCompleted: completedCount,
    totalVideos: totalSteps,
    videosUntilNextCoin:
      requiredForReward - (newVideosWatched % requiredForReward || requiredForReward),
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

export const getCampaignSponsorSequence = onCall(async (request) => {
  await assertAuthenticated(request.auth?.uid);
  const { campaignId } = request.data as { campaignId: string };
  if (!campaignId) throw new HttpsError('invalid-argument', 'campaignId é obrigatório');

  const steps = await getCampaignSponsorSteps(db, campaignId);
  return { success: true, steps };
});
