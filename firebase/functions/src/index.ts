import * as os from 'os';
import * as path from 'path';

import { FIRESTORE_COLLECTIONS, VideoProcessingStatus } from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { isAwsConfigured } from '../config/aws';
import { db, storage } from '../config/firebase';
import { uploadToS3, uploadBufferToS3, generateS3Key } from '../services/aws-s3.service';
import {
  compressVideo,
  generateSubtitles,
  cleanupTempFiles,
} from '../services/video-processing.service';

/** Trigger: processa vídeo após upload no Firebase Storage */
export const onVideoUploadComplete = onDocumentUpdated(
  `${FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS}/{videoId}`,
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const videoId = event.params.videoId;

    if (!before || !after) return;
    if (
      before.processingStatus === after.processingStatus ||
      after.processingStatus !== VideoProcessingStatus.PENDING_UPLOAD
    ) {
      return;
    }

    if (!isAwsConfigured()) {
      await event.data?.after.ref.update({
        processingStatus: VideoProcessingStatus.FAILED,
        processingError: 'AWS não configurado. Defina variáveis de ambiente AWS.',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const videoRef = event.data!.after.ref;
    let tempInputPath = '';
    let tempCompressedPath = '';
    let tempVttPath = '';

    try {
      await videoRef.update({
        processingStatus: VideoProcessingStatus.COMPRESSING,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const originalUrl = after.originalUrl as string;
      if (!originalUrl) throw new Error('URL original não encontrada');

      const bucket = storage.bucket();
      const storagePath = `videos/temp/${videoId}/${after.originalFileName}`;
      tempInputPath = path.join(os.tmpdir(), `input-${videoId}-${Date.now()}`);
      await bucket.file(storagePath).download({ destination: tempInputPath });

      const compressed = await compressVideo(tempInputPath);
      tempCompressedPath = compressed.outputPath;

      await videoRef.update({
        processingStatus: VideoProcessingStatus.TRANSCRIBING,
        durationSeconds: compressed.durationSeconds,
        fileSizeBytes: compressed.fileSizeBytes,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const { vttContent, vttPath } = await generateSubtitles(tempCompressedPath);
      tempVttPath = vttPath;

      await videoRef.update({
        processingStatus: VideoProcessingStatus.UPLOADING_S3,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const videoKey = generateS3Key(videoId, 'video.mp4');
      const vttKey = generateS3Key(videoId, 'subtitles.vtt');

      const cloudFrontVideoUrl = await uploadToS3(tempCompressedPath, videoKey, 'video/mp4');
      const cloudFrontVttUrl = await uploadBufferToS3(
        Buffer.from(vttContent, 'utf-8'),
        vttKey,
        'text/vtt',
      );

      await videoRef.update({
        processingStatus: VideoProcessingStatus.READY,
        processedUrl: cloudFrontVideoUrl,
        cloudFrontUrl: cloudFrontVideoUrl,
        s3Key: videoKey,
        subtitlesUrl: cloudFrontVttUrl,
        subtitlesVtt: vttContent,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      await videoRef.update({
        processingStatus: VideoProcessingStatus.FAILED,
        processingError: message,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } finally {
      cleanupTempFiles(tempInputPath, tempCompressedPath, tempVttPath);
    }
  },
);

/** Callable: registra conclusão de vídeo e credita moedas */
export const onVideoCompleted = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { campaignId, videoId, watchedSeconds, watchedPercent } = request.data as {
    campaignId: string;
    videoId: string;
    watchedSeconds: number;
    watchedPercent: number;
  };

  if (!campaignId || !videoId) {
    throw new HttpsError('invalid-argument', 'campaignId e videoId são obrigatórios');
  }

  const userId = request.auth.uid;
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

  const campaignRef = db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(campaignId);
  batch.update(campaignRef, {
    viewCount: FieldValue.increment(1),
    conversionCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const campaignSnap = await campaignRef.get();
  const coinReward = campaignSnap.data()?.coinReward ?? 1;

  const walletQuery = await db
    .collection(FIRESTORE_COLLECTIONS.COINS)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  let walletRef;
  let newBalance: number;

  if (walletQuery.empty) {
    walletRef = db.collection(FIRESTORE_COLLECTIONS.COINS).doc();
    newBalance = coinReward;
    batch.set(walletRef, {
      userId,
      balance: coinReward,
      totalEarned: coinReward,
      totalSpent: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    walletRef = walletQuery.docs[0].ref;
    const currentBalance = walletQuery.docs[0].data().balance ?? 0;
    newBalance = currentBalance + coinReward;
    batch.update(walletRef, {
      balance: FieldValue.increment(coinReward),
      totalEarned: FieldValue.increment(coinReward),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  batch.update(db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId), {
    coinBalance: FieldValue.increment(coinReward),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const txRef = db.collection(FIRESTORE_COLLECTIONS.COIN_TRANSACTIONS).doc();
  batch.set(txRef, {
    userId,
    type: 'EARNED',
    amount: coinReward,
    balanceAfter: newBalance,
    campaignId,
    description: `Moedas ganhas por completar campanha`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { success: true, coinsEarned: coinReward, newBalance };
});

/** Callable: envia notificação push segmentada */
export const sendPushNotification = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const adminDoc = await db.collection(FIRESTORE_COLLECTIONS.ADMINS).doc(request.auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data()?.isActive) {
    throw new HttpsError('permission-denied', 'Acesso negado');
  }

  const { title, body, audience, targetCityId, targetCampaignId, data } = request.data;

  let usersQuery = db.collection(FIRESTORE_COLLECTIONS.USERS).where('isActive', '==', true);

  if (audience === 'CITY' && targetCityId) {
    usersQuery = usersQuery.where('cityId', '==', targetCityId);
  }

  const usersSnap = await usersQuery.limit(500).get();
  const tokens: string[] = [];

  usersSnap.docs.forEach((doc) => {
    const fcmTokens = doc.data().fcmTokens as string[] | undefined;
    if (fcmTokens?.length) {
      tokens.push(...fcmTokens);
    }
  });

  const notificationRef = await db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).add({
    title,
    body,
    type: request.data.type || 'SYSTEM',
    audience,
    targetCityId,
    targetCampaignId,
    status: 'SENT',
    sentCount: tokens.length,
    data,
    createdBy: request.auth.uid,
    sentAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // FCM batch send via admin.messaging() - tokens deduplicated
  const uniqueTokens = [...new Set(tokens)];
  if (uniqueTokens.length > 0) {
    const { admin: firebaseAdmin } = await import('../config/firebase');
    await firebaseAdmin.messaging().sendEachForMulticast({
      tokens: uniqueTokens.slice(0, 500),
      notification: { title, body },
      data: data || {},
    });
  }

  return { success: true, notificationId: notificationRef.id, sentCount: uniqueTokens.length };
});

/** Audit log on admin document changes */
export const onAdminAuditLog = onDocumentCreated(
  `${FIRESTORE_COLLECTIONS.AUDIT_LOGS}/{logId}`,
  async () => {
    // Reserved for future Cloud Logging integration
  },
);
