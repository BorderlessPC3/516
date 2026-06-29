import { AuditAction, CouponStatus, FIRESTORE_COLLECTIONS, MAX_PIZZA_COUPONS_PER_PURCHASE, generateCouponCode } from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { assertAdmin, assertAuthenticated } from '../services/admin-guard';
import { writeAuditLog } from '../services/audit.service';
import { generateCouponForUser } from '../services/coupon.service';
import { db } from '../config/firebase';

export const createCoupon = onCall(async (request) => {
  const adminUid = await assertAuthenticated(request.auth?.uid);
  const adminData = await assertAdmin(db, adminUid);
  const data = request.data as {
    campaignId: string;
    userId: string;
    code?: string;
    prizeId?: string;
    validFrom: string;
    validUntil: string;
    rules?: string;
    isActive?: boolean;
  };

  const campaignSnap = await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(data.campaignId).get();
  const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(data.userId).get();
  if (!campaignSnap.exists || !userSnap.exists) {
    throw new HttpsError('not-found', 'Campanha ou usuário não encontrado');
  }

  let code = data.code ?? generateCouponCode();
  const dup = await db.collection(FIRESTORE_COLLECTIONS.COUPONS).where('code', '==', code).limit(1).get();
  if (!dup.empty) throw new HttpsError('already-exists', 'Código de cupom já existe');

  const campaign = campaignSnap.data()!;
  const user = userSnap.data()!;
  const ref = db.collection(FIRESTORE_COLLECTIONS.COUPONS).doc();

  await ref.set({
    code,
    campaignId: data.campaignId,
    campaignName: campaign.name,
    userId: data.userId,
    userName: user.name,
    userPhone: user.phone,
    prizeId: data.prizeId,
    status: CouponStatus.ACTIVE,
    validFrom: data.validFrom,
    validUntil: data.validUntil,
    rules: data.rules ?? 'Conforme regulamento.',
    isActive: data.isActive ?? true,
    qrPayload: `HP:COUPON:${ref.id}`,
    createdBy: adminUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(data.userId).update({
    couponIds: FieldValue.arrayUnion(ref.id),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog(db, {
    adminId: adminUid,
    adminEmail: adminData.email,
    action: AuditAction.CREATE,
    resource: 'coupons',
    resourceId: ref.id,
  });

  return { success: true, couponId: ref.id, code };
});

export const generateCampaignCoupon = onCall(async (request) => {
  const userId = await assertAuthenticated(request.auth?.uid);
  const { campaignId } = request.data as { campaignId: string };

  const campaignSnap = await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(campaignId).get();
  if (!campaignSnap.exists) throw new HttpsError('not-found', 'Campanha não encontrada');

  const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId).get();
  const user = userSnap.data() ?? {};

  const couponId = await generateCouponForUser(db, {
    userId,
    campaignId,
    campaignName: campaignSnap.data()?.name as string,
    userName: user.name as string,
    userPhone: user.phone as string,
    createdBy: userId,
  });

  return { success: true, couponId };
});

export const createCouponTemplate = onCall(async (request) => {
  const adminUid = await assertAuthenticated(request.auth?.uid);
  const adminData = await assertAdmin(db, adminUid);
  const data = request.data;

  const campaignSnap = await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(data.campaignId).get();
  const ref = await db.collection(FIRESTORE_COLLECTIONS.COUPON_TEMPLATES).add({
    ...data,
    campaignName: campaignSnap.data()?.name,
    quantityUsed: 0,
    createdBy: adminUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog(db, {
    adminId: adminUid,
    adminEmail: adminData.email,
    action: AuditAction.CREATE,
    resource: 'couponTemplates',
    resourceId: ref.id,
  });

  return { success: true, templateId: ref.id };
});

export const generatePurchaseCoupons = onCall(async (request) => {
  const adminUid = await assertAuthenticated(request.auth?.uid);
  await assertAdmin(db, adminUid);

  const { campaignId, userId, pizzaCount } = request.data as {
    campaignId: string;
    userId: string;
    pizzaCount: number;
  };

  if (!campaignId || !userId) {
    throw new HttpsError('invalid-argument', 'campaignId e userId são obrigatórios');
  }
  if (pizzaCount < 1 || pizzaCount > MAX_PIZZA_COUPONS_PER_PURCHASE) {
    throw new HttpsError(
      'invalid-argument',
      `Quantidade deve ser entre 1 e ${MAX_PIZZA_COUPONS_PER_PURCHASE}`,
    );
  }

  const campaignSnap = await db.collection(FIRESTORE_COLLECTIONS.CAMPAIGNS).doc(campaignId).get();
  const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId).get();
  if (!campaignSnap.exists || !userSnap.exists) {
    throw new HttpsError('not-found', 'Campanha ou usuário não encontrado');
  }

  const campaign = campaignSnap.data()!;
  const user = userSnap.data()!;
  const couponIds: string[] = [];
  const validUntil = campaign.endDate ?? new Date(Date.now() + 30 * 86400000).toISOString();

  for (let i = 0; i < pizzaCount; i++) {
    const couponId = await generateCouponForUser(db, {
      userId,
      campaignId,
      campaignName: campaign.name as string,
      userName: user.name as string,
      userPhone: user.phone as string,
      validDays: Math.ceil(
        (new Date(validUntil as string).getTime() - Date.now()) / 86400000,
      ),
      rules: `Cupom gerado por compra de pizza (${i + 1}/${pizzaCount}).`,
      createdBy: adminUid,
    });
    couponIds.push(couponId);
  }

  return { success: true, couponIds, count: couponIds.length };
});
