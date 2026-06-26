import { NotificationStatus } from '@herois/shared';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue } from 'firebase-admin/firestore';

import { assertAdmin, assertAuthenticated } from '../services/admin-guard';
import {
  createNotificationLog,
  resolveTargetUsers,
  sendPushToUsers,
  type PushPayload,
} from '../services/push.service';
import { FIRESTORE_COLLECTIONS } from '@herois/shared';
import { admin, db } from '../config/firebase';

export const sendPushNotification = onCall(async (request) => {
  const adminUid = await assertAuthenticated(request.auth?.uid);
  await assertAdmin(db, adminUid);

  const payload = request.data as PushPayload & {
    type?: string;
    scheduledAt?: string;
    notificationId?: string;
    sendNow?: boolean;
  };

  if (!payload.title || !payload.body) {
    throw new HttpsError('invalid-argument', 'Título e mensagem são obrigatórios');
  }

  if (payload.scheduledAt && !payload.sendNow) {
    const scheduledDate = new Date(payload.scheduledAt);
    if (scheduledDate > new Date()) {
      const notificationId = await createNotificationLog(db, {
        ...payload,
        status: NotificationStatus.SCHEDULED,
        createdBy: adminUid,
        scheduledAt: payload.scheduledAt,
      });
      return { success: true, notificationId, scheduled: true };
    }
  }

  const users = await resolveTargetUsers(db, payload);
  const { sentCount, failedCount } = await sendPushToUsers(
    admin.messaging(),
    users,
    payload.title,
    payload.body,
    payload.data,
  );

  const notificationId = await createNotificationLog(db, {
    ...payload,
    status: NotificationStatus.SENT,
    createdBy: adminUid,
    sentCount,
    failedCount,
    notificationId: payload.notificationId,
  });

  return { success: true, notificationId, sentCount, failedCount };
});

export const cancelScheduledNotification = onCall(async (request) => {
  const adminUid = await assertAuthenticated(request.auth?.uid);
  await assertAdmin(db, adminUid);
  const { notificationId } = request.data as { notificationId: string };

  await db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc(notificationId).update({
    status: NotificationStatus.FAILED,
    cancelledAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

export const processScheduledNotifications = onSchedule('every 5 minutes', async () => {
  const now = new Date().toISOString();
  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS)
    .where('status', '==', NotificationStatus.SCHEDULED)
    .where('scheduledAt', '<=', now)
    .limit(20)
    .get();

  for (const doc of snap.docs) {
    const data = doc.data();
    try {
      const users = await resolveTargetUsers(db, {
        title: data.title,
        body: data.body,
        audience: data.audience,
        targetCityId: data.targetCityId,
        targetState: data.targetState,
        targetCampaignId: data.targetCampaignId,
        targetUserId: data.targetUserId,
        data: data.data,
      });

      const { sentCount, failedCount } = await sendPushToUsers(
        admin.messaging(),
        users,
        data.title,
        data.body,
        data.data,
      );

      await doc.ref.update({
        status: NotificationStatus.SENT,
        sentCount,
        failedCount,
        sentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      await doc.ref.update({
        status: NotificationStatus.FAILED,
        failedCount: 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.error(`Failed to send notification ${doc.id}:`, error);
    }
  }
});
