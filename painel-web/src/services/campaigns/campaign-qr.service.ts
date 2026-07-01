import {
  FIRESTORE_COLLECTIONS,
  QrCodeStatus,
  buildCampaignWebUrl,
  type CampaignQrCode,
} from '@herois/shared';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/services/firebase/client';

export async function syncCampaignQrCode(
  campaignId: string,
  deepLinkDomain: string,
): Promise<string> {
  const payload = buildCampaignWebUrl(campaignId, deepLinkDomain);
  const uid = auth.currentUser?.uid ?? 'system';

  const existing = await getDocs(
    query(
      collection(db, FIRESTORE_COLLECTIONS.CAMPAIGN_QR_CODES),
      where('campaignId', '==', campaignId),
      where('payload', '==', payload),
    ),
  );

  if (!existing.empty) {
    const qrId = existing.docs[0].id;
    await setDoc(
      doc(db, FIRESTORE_COLLECTIONS.CAMPAIGN_QR_CODES, qrId),
      {
        status: QrCodeStatus.ACTIVE,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return payload;
  }

  const qrRef = doc(collection(db, FIRESTORE_COLLECTIONS.CAMPAIGN_QR_CODES));
  await setDoc(qrRef, {
    campaignId,
    payload,
    status: QrCodeStatus.ACTIVE,
    scanCount: 0,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies Omit<CampaignQrCode, 'id'>);

  return payload;
}
