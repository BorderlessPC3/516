import {
  AuditAction,
  CoinTransactionType,
  DrawStatus,
  FIRESTORE_COLLECTIONS,
} from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { assertAdmin, assertAuthenticated } from '../services/admin-guard';
import { writeAuditLog } from '../services/audit.service';
import { debitCoins } from '../services/coins.service';
import { createNotificationLog, resolveTargetUsers, sendPushToUsers } from '../services/push.service';
import { NotificationStatus, NotificationType } from '@herois/shared';
import { admin, db } from '../config/firebase';

export const participateInDraw = onCall(async (request) => {
  const userId = await assertAuthenticated(request.auth?.uid);
  const { drawId } = request.data as { drawId: string };

  if (!drawId) throw new HttpsError('invalid-argument', 'drawId é obrigatório');

  const drawRef = db.collection(FIRESTORE_COLLECTIONS.DRAWS).doc(drawId);
  const drawSnap = await drawRef.get();
  if (!drawSnap.exists) throw new HttpsError('not-found', 'Sorteio não encontrado');

  const draw = drawSnap.data()!;
  if (draw.status !== DrawStatus.OPEN && draw.status !== DrawStatus.SCHEDULED) {
    throw new HttpsError('failed-precondition', 'Sorteio não está aberto para participação');
  }

  const participantId = `${drawId}_${userId}`;
  const existing = await db.collection(FIRESTORE_COLLECTIONS.DRAW_PARTICIPANTS).doc(participantId).get();
  if (existing.exists) {
    return { success: true, alreadyParticipating: true };
  }

  const minCoins = (draw.minCoinsRequired as number) ?? 0;
  if (minCoins > 0) {
    await debitCoins(db, userId, minCoins, `Participação no sorteio: ${draw.name}`, drawId);
  }

  const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId).get();
  const user = userSnap.data() ?? {};

  const batch = db.batch();
  batch.set(db.collection(FIRESTORE_COLLECTIONS.DRAW_PARTICIPANTS).doc(participantId), {
    drawId,
    userId,
    userName: user.name,
    userPhone: user.phone,
    coinsSpent: minCoins,
    isWinner: false,
    participatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.update(drawRef, {
    participantCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.update(db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId), {
    drawIds: FieldValue.arrayUnion(drawId),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { success: true };
});

export const executeDraw = onCall(async (request) => {
  const adminUid = await assertAuthenticated(request.auth?.uid);
  const adminData = await assertAdmin(db, adminUid);
  const { drawId } = request.data as { drawId: string };

  if (!drawId) throw new HttpsError('invalid-argument', 'drawId é obrigatório');

  const drawRef = db.collection(FIRESTORE_COLLECTIONS.DRAWS).doc(drawId);
  const drawSnap = await drawRef.get();
  if (!drawSnap.exists) throw new HttpsError('not-found', 'Sorteio não encontrado');

  const draw = drawSnap.data()!;
  if (draw.status === DrawStatus.DRAWN) {
    throw new HttpsError('already-exists', 'Sorteio já realizado');
  }

  const participantsSnap = await db
    .collection(FIRESTORE_COLLECTIONS.DRAW_PARTICIPANTS)
    .where('drawId', '==', drawId)
    .get();

  if (participantsSnap.empty) {
    throw new HttpsError('failed-precondition', 'Nenhum participante no sorteio');
  }

  const participants = participantsSnap.docs;
  const winnerCount = Math.min((draw.winnerCount as number) ?? 1, participants.length);
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, winnerCount);

  const batch = db.batch();
  const winnerIds: string[] = [];
  const winnerNames: string[] = [];

  winners.forEach((winnerDoc) => {
    const data = winnerDoc.data();
    winnerIds.push(data.userId as string);
    winnerNames.push((data.userName as string) ?? 'Participante');
    batch.update(winnerDoc.ref, { isWinner: true, updatedAt: FieldValue.serverTimestamp() });
  });

  batch.update(drawRef, {
    status: DrawStatus.DRAWN,
    winnerUserIds: winnerIds,
    winnerNames,
    winnerUserId: winnerIds[0],
    winnerName: winnerNames[0],
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  await writeAuditLog(db, {
    adminId: adminUid,
    adminEmail: adminData.email,
    action: AuditAction.UPDATE,
    resource: 'draws',
    resourceId: drawId,
    changes: { winnerUserIds: winnerIds, winnerNames },
  });

  for (const winnerId of winnerIds) {
    const users = [{ id: winnerId, fcmTokens: [] as string[] }];
    const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(winnerId).get();
    if (userDoc.exists) {
      users[0].fcmTokens = (userDoc.data()?.fcmTokens as string[]) ?? [];
    }
    await sendPushToUsers(
      admin.messaging(),
      users,
      'Parabéns! Você ganhou!',
      `Você foi sorteado no prêmio: ${draw.prizeName ?? draw.name}`,
      { drawId, type: 'PRIZE_WON' },
    );
  }

  return { success: true, winnerIds, winnerNames };
});

export const createDraw = onCall(async (request) => {
  const adminUid = await assertAuthenticated(request.auth?.uid);
  const adminData = await assertAdmin(db, adminUid);
  const data = request.data;

  const prizeSnap = await db.collection(FIRESTORE_COLLECTIONS.PRIZES).doc(data.prizeId).get();
  const prize = prizeSnap.data();

  const ref = await db.collection(FIRESTORE_COLLECTIONS.DRAWS).add({
    ...data,
    prizeName: prize?.name,
    prizeType: prize?.type,
    participantCount: 0,
    winnerCount: data.winnerCount ?? 1,
    createdBy: adminUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog(db, {
    adminId: adminUid,
    adminEmail: adminData.email,
    action: AuditAction.CREATE,
    resource: 'draws',
    resourceId: ref.id,
  });

  return { success: true, drawId: ref.id };
});
