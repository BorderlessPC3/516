import {
  CampaignStatus,
  FIRESTORE_COLLECTIONS,
  QrCodeStatus,
  ScanRejectReason,
  ScannerType,
  isCampaignActive,
  parseQrCampaignId,
  toDate,
} from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { assertAuthenticated } from '../services/admin-guard';
import { db } from '../config/firebase';

export const validateQrScan = onCall(async (request) => {
  const userId = await assertAuthenticated(request.auth?.uid);
  const { payload, location, deviceId } = request.data as {
    payload: string;
    location?: { latitude: number; longitude: number; accuracy?: number };
    deviceId?: string;
  };

  if (!payload) throw new HttpsError('invalid-argument', 'Payload QR é obrigatório');

  const campaignId = parseQrCampaignId(payload);
  if (!campaignId) {
    return {
      isValid: false,
      rejectReason: ScanRejectReason.INVALID,
      message: 'QR Code inválido',
    };
  }

  const campaignRef = db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(campaignId);
  const campaignSnap = await campaignRef.get();
  if (!campaignSnap.exists) {
    return {
      isValid: false,
      rejectReason: ScanRejectReason.INVALID,
      message: 'Campanha não encontrada',
    };
  }

  const campaign = campaignSnap.data()!;
  const now = new Date();

  if (!isCampaignActive(campaign.status as string, toDate(campaign.startDate), toDate(campaign.endDate), now)) {
    const reason =
      campaign.status === CampaignStatus.ENDED || toDate(campaign.endDate) < now
        ? ScanRejectReason.CAMPAIGN_ENDED
        : ScanRejectReason.CAMPAIGN_INACTIVE;
    return {
      isValid: false,
      rejectReason: reason,
      message: 'Campanha não está ativa',
      campaignId,
    };
  }

  const qrCodeSnap = await db
    .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_QR_CODES)
    .where('campaignId', '==', campaignId)
    .where('payload', '==', payload)
    .limit(1)
    .get();

  if (!qrCodeSnap.empty) {
    const qrData = qrCodeSnap.docs[0].data();
    if (qrData.status === QrCodeStatus.DISABLED || qrData.status === QrCodeStatus.EXPIRED) {
      return {
        isValid: false,
        rejectReason: ScanRejectReason.EXPIRED,
        message: 'QR Code expirado ou desativado',
        campaignId,
      };
    }
    if (qrData.expiresAt && toDate(qrData.expiresAt) < now) {
      await qrCodeSnap.docs[0].ref.update({ status: QrCodeStatus.EXPIRED });
      return {
        isValid: false,
        rejectReason: ScanRejectReason.EXPIRED,
        message: 'QR Code expirado',
        campaignId,
      };
    }
    if (qrData.maxScans && (qrData.scanCount ?? 0) >= qrData.maxScans) {
      return {
        isValid: false,
        rejectReason: ScanRejectReason.EXPIRED,
        message: 'QR Code atingiu limite de leituras',
        campaignId,
      };
    }
  }

  const duplicateSnap = await db
    .collection(FIRESTORE_COLLECTIONS.QR_SCANS)
    .where('userId', '==', userId)
    .where('campaignId', '==', campaignId)
    .limit(1)
    .get();

  if (!duplicateSnap.empty) {
    return {
      isValid: false,
      rejectReason: ScanRejectReason.DUPLICATE,
      message: 'Você já escaneou este QR Code',
      campaignId,
    };
  }

  const batch = db.batch();

  const scanRef = db.collection(FIRESTORE_COLLECTIONS.QR_SCANS).doc();
  batch.set(scanRef, {
    userId,
    campaignId,
    qrPayload: payload,
    scannerType: ScannerType.QR_CODE,
    deviceId,
    location,
    scannedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const participationId = `${userId}_${campaignId}`;
  const participationRef = db.collection(FIRESTORE_COLLECTIONS.CAMPAIGN_PARTICIPATIONS).doc(participationId);
  batch.set(
    participationRef,
    {
      userId,
      campaignId,
      startedAt: FieldValue.serverTimestamp(),
      videosCompleted: 0,
      totalVideos: 0,
      coinsEarned: 0,
      isCompleted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (!qrCodeSnap.empty) {
    batch.update(qrCodeSnap.docs[0].ref, {
      scanCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return {
    isValid: true,
    campaignId,
    scanId: scanRef.id,
    message: 'QR Code validado com sucesso',
  };
});
