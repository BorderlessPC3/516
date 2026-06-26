import { CouponStatus, FIRESTORE_COLLECTIONS, generateCouponCode } from '@herois/shared';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export async function generateCouponForUser(
  db: Firestore,
  params: {
    userId: string;
    campaignId: string;
    campaignName?: string;
    userName?: string;
    userPhone?: string;
    prizeId?: string;
    prizeName?: string;
    validDays?: number;
    rules?: string;
    createdBy?: string;
  },
): Promise<string> {
  const { userId, campaignId } = params;

  const existing = await db
    .collection(FIRESTORE_COLLECTIONS.COUPONS)
    .where('userId', '==', userId)
    .where('campaignId', '==', campaignId)
    .where('status', '==', CouponStatus.ACTIVE)
    .limit(1)
    .get();

  if (!existing.empty) return existing.docs[0].id;

  let code = generateCouponCode();
  let attempts = 0;
  while (attempts < 5) {
    const dup = await db
      .collection(FIRESTORE_COLLECTIONS.COUPONS)
      .where('code', '==', code)
      .limit(1)
      .get();
    if (dup.empty) break;
    code = generateCouponCode();
    attempts++;
  }

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + (params.validDays ?? 30));

  const couponRef = db.collection(FIRESTORE_COLLECTIONS.COUPONS).doc();
  const qrPayload = `HP:COUPON:${couponRef.id}`;

  await couponRef.set({
    code,
    campaignId,
    campaignName: params.campaignName,
    userId,
    userName: params.userName,
    userPhone: params.userPhone,
    prizeId: params.prizeId,
    prizeName: params.prizeName,
    status: CouponStatus.ACTIVE,
    validFrom: now.toISOString(),
    validUntil: validUntil.toISOString(),
    qrPayload,
    rules: params.rules ?? 'Cupom válido conforme regulamento da campanha.',
    isActive: true,
    createdBy: params.createdBy ?? 'system',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId).update({
    couponIds: FieldValue.arrayUnion(couponRef.id),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return couponRef.id;
}

export async function expireCoupons(db: Firestore): Promise<number> {
  const now = new Date().toISOString();
  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.COUPONS)
    .where('status', '==', CouponStatus.ACTIVE)
    .where('validUntil', '<', now)
    .limit(500)
    .get();

  if (snap.empty) return 0;

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: CouponStatus.EXPIRED,
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return snap.size;
}
