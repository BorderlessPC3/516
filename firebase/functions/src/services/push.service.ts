import {
  FCM_BATCH_SIZE,
  FIRESTORE_COLLECTIONS,
  INACTIVE_USER_DAYS,
  NotificationAudience,
  NotificationStatus,
} from '@herois/shared';
import { FieldValue, type Firestore, type Query } from 'firebase-admin/firestore';
import type { messaging } from 'firebase-admin';

export interface PushPayload {
  title: string;
  body: string;
  audience: NotificationAudience | string;
  targetCityId?: string;
  targetState?: string;
  targetCampaignId?: string;
  targetUserId?: string;
  data?: Record<string, string>;
}

export async function resolveTargetUsers(
  db: Firestore,
  payload: PushPayload,
): Promise<Array<{ id: string; fcmTokens: string[] }>> {
  let usersQuery: Query = db.collection(FIRESTORE_COLLECTIONS.USERS);

  switch (payload.audience) {
    case NotificationAudience.CITY:
      if (payload.targetCityId) {
        usersQuery = usersQuery.where('cityId', '==', payload.targetCityId);
      }
      break;
    case NotificationAudience.STATE:
      if (payload.targetState) {
        usersQuery = usersQuery.where('state', '==', payload.targetState);
      }
      break;
    case NotificationAudience.USER:
      if (payload.targetUserId) {
        const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(payload.targetUserId).get();
        if (!userDoc.exists) return [];
        const data = userDoc.data()!;
        return [{ id: userDoc.id, fcmTokens: (data.fcmTokens as string[]) ?? [] }];
      }
      return [];
    case NotificationAudience.ACTIVE_USERS:
      usersQuery = usersQuery.where('isActive', '==', true);
      break;
    case NotificationAudience.INACTIVE_USERS: {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - INACTIVE_USER_DAYS);
      usersQuery = usersQuery.where('isActive', '==', true).where('lastLoginAt', '<', cutoff.toISOString());
      break;
    }
    case NotificationAudience.NO_COINS:
      usersQuery = usersQuery.where('coinBalance', '==', 0);
      break;
    case NotificationAudience.NO_COUPONS:
      usersQuery = usersQuery.where('couponIds', '==', []);
      break;
    case NotificationAudience.CAMPAIGN:
      if (payload.targetCampaignId) {
        const participations = await db
          .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_PARTICIPATIONS)
          .where('campaignId', '==', payload.targetCampaignId)
          .limit(500)
          .get();
        const userIds = participations.docs.map((d) => d.data().userId as string);
        const users = await Promise.all(
          userIds.map(async (uid) => {
            const doc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).get();
            if (!doc.exists) return null;
            return { id: doc.id, fcmTokens: (doc.data()?.fcmTokens as string[]) ?? [] };
          }),
        );
        return users.filter((u): u is { id: string; fcmTokens: string[] } => u !== null);
      }
      break;
    case NotificationAudience.NO_VIDEOS:
      usersQuery = usersQuery.where('videosWatched', '==', 0);
      break;
    default:
      usersQuery = usersQuery.where('isActive', '==', true);
  }

  const snap = await usersQuery.limit(1000).get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    fcmTokens: (doc.data().fcmTokens as string[]) ?? [],
  }));
}

export async function sendPushToUsers(
  messagingService: messaging.Messaging,
  users: Array<{ id: string; fcmTokens: string[] }>,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ sentCount: number; failedCount: number }> {
  const tokens: string[] = [];
  users.forEach((u) => {
    if (u.fcmTokens?.length) tokens.push(...u.fcmTokens);
  });

  const uniqueTokens = [...new Set(tokens)];
  if (uniqueTokens.length === 0) return { sentCount: 0, failedCount: 0 };

  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < uniqueTokens.length; i += FCM_BATCH_SIZE) {
    const batch = uniqueTokens.slice(i, i + FCM_BATCH_SIZE);
    const result = await messagingService.sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data: data ?? {},
    });
    sentCount += result.successCount;
    failedCount += result.failureCount;
  }

  return { sentCount, failedCount };
}

export async function createNotificationLog(
  db: Firestore,
  payload: PushPayload & {
    type?: string;
    status: NotificationStatus;
    createdBy: string;
    sentCount?: number;
    failedCount?: number;
    scheduledAt?: string;
    pushEvent?: string;
    notificationId?: string;
  },
): Promise<string> {
  if (payload.notificationId) {
    await db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc(payload.notificationId).update({
      status: payload.status,
      sentCount: payload.sentCount ?? 0,
      failedCount: payload.failedCount ?? 0,
      sentAt: payload.status === NotificationStatus.SENT ? FieldValue.serverTimestamp() : undefined,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return payload.notificationId;
  }

  const ref = await db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).add({
    title: payload.title,
    body: payload.body,
    type: payload.type ?? 'SYSTEM',
    audience: payload.audience,
    targetCityId: payload.targetCityId,
    targetState: payload.targetState,
    targetCampaignId: payload.targetCampaignId,
    targetUserId: payload.targetUserId,
    status: payload.status,
    sentCount: payload.sentCount ?? 0,
    failedCount: payload.failedCount ?? 0,
    data: payload.data,
    scheduledAt: payload.scheduledAt,
    pushEvent: payload.pushEvent,
    createdBy: payload.createdBy,
    sentAt: payload.status === NotificationStatus.SENT ? FieldValue.serverTimestamp() : undefined,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
