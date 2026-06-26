import {
  CampaignStatus,
  FIRESTORE_COLLECTIONS,
  NotificationAudience,
  PushEventType,
} from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

import { createNotificationLog, resolveTargetUsers, sendPushToUsers } from '../services/push.service';
import { NotificationStatus, NotificationType } from '@herois/shared';
import { admin, db } from '../config/firebase';

async function sendEventPush(
  title: string,
  body: string,
  audience: NotificationAudience,
  targetCampaignId?: string,
  targetCityId?: string,
  pushEvent?: PushEventType,
) {
  const users = await resolveTargetUsers(db, {
    title,
    body,
    audience,
    targetCampaignId,
    targetCityId,
  });

  const { sentCount, failedCount } = await sendPushToUsers(
    admin.messaging(),
    users,
    title,
    body,
    { pushEvent: pushEvent ?? '' },
  );

  await createNotificationLog(db, {
    title,
    body,
    audience,
    targetCampaignId,
    targetCityId,
    type: NotificationType.SYSTEM,
    status: NotificationStatus.SENT,
    createdBy: 'system',
    sentCount,
    failedCount,
    pushEvent,
  });
}

export const onCampaignStatusChange = onDocumentUpdated(
  `${FIRESTORE_COLLECTIONS.CAMPAIGNS}/{campaignId}`,
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.status === after.status) return;

    if (after.status === CampaignStatus.ACTIVE) {
      await sendEventPush(
        'Nova campanha disponível!',
        `${after.name} já está ativa. Escaneie o QR Code e participe!`,
        NotificationAudience.ALL,
        event.params.campaignId,
        after.cityId as string | undefined,
        PushEventType.CAMPAIGN_STARTED,
      );
    }

    if (after.status === CampaignStatus.ACTIVE && before.status !== CampaignStatus.ACTIVE) {
      await sendEventPush(
        'Campanha encerrando em breve',
        `A campanha ${after.name} está chegando ao fim. Não perca!`,
        after.cityId ? NotificationAudience.CITY : NotificationAudience.ALL,
        event.params.campaignId,
        after.cityId as string | undefined,
        PushEventType.CAMPAIGN_ENDING,
      );
    }
  },
);

export const onCampaignVideoReady = onDocumentUpdated(
  `${FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS}/{videoId}`,
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.processingStatus === after.processingStatus) return;
    if (after.processingStatus !== 'READY') return;

    const campaignId = after.campaignId as string | undefined;
    if (campaignId) {
      await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(campaignId).update({
        videoIds: FieldValue.arrayUnion(event.params.videoId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await sendEventPush(
      'Novo vídeo disponível',
      `Assista ao vídeo: ${after.title}`,
      campaignId ? NotificationAudience.CAMPAIGN : NotificationAudience.ALL,
      campaignId,
      undefined,
      PushEventType.NEW_VIDEO,
    );
  },
);

export const onPrizeCreated = onDocumentCreated(
  `${FIRESTORE_COLLECTIONS.PRIZES}/{prizeId}`,
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    await sendEventPush(
      'Novo prêmio cadastrado!',
      `Confira o prêmio: ${data.name}`,
      NotificationAudience.ALL,
      undefined,
      undefined,
      PushEventType.NEW_PRIZE,
    );
  },
);

export const onCouponCreated = onDocumentCreated(
  `${FIRESTORE_COLLECTIONS.COUPONS}/{couponId}`,
  async (event) => {
    const data = event.data?.data();
    if (!data?.userId) return;

    const users = [{ id: data.userId as string, fcmTokens: [] as string[] }];
    const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(data.userId as string).get();
    if (userDoc.exists) {
      users[0].fcmTokens = (userDoc.data()?.fcmTokens as string[]) ?? [];
    }

    await sendPushToUsers(
      admin.messaging(),
      users,
      'Novo cupom disponível!',
      `Seu cupom ${data.code} está pronto para uso.`,
      { couponId: event.params.couponId, type: PushEventType.NEW_COUPON },
    );
  },
);

export const onDrawCreated = onDocumentCreated(
  `${FIRESTORE_COLLECTIONS.DRAWS}/{drawId}`,
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    await sendEventPush(
      'Novo sorteio!',
      `Participe do sorteio: ${data.name}`,
      NotificationAudience.ALL,
      data.campaignId as string | undefined,
      undefined,
      PushEventType.DRAW_UPCOMING,
    );
  },
);
