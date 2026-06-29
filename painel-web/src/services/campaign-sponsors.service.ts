import { FIRESTORE_COLLECTIONS } from '@herois/shared';
import type { CampaignSponsor, Sponsor } from '@herois/shared';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/services/firebase/client';

export async function syncCampaignSponsors(
  campaignId: string,
  sponsorIds: string[],
  sponsors: Sponsor[],
): Promise<void> {
  const existing = await getDocs(
    query(collection(db, FIRESTORE_COLLECTIONS.CAMPAIGN_SPONSORS), where('campaignId', '==', campaignId)),
  );

  await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));

  await Promise.all(
    sponsorIds.map((sponsorId, index) => {
      const sponsor = sponsors.find((s) => s.id === sponsorId);
      const linkId = `${campaignId}_${sponsorId}`;
      return setDoc(doc(db, FIRESTORE_COLLECTIONS.CAMPAIGN_SPONSORS, linkId), {
        campaignId,
        sponsorId,
        sponsorName: sponsor?.name ?? '',
        sequenceOrder: index,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }),
  );
}

export async function getCampaignSponsorIds(campaignId: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, FIRESTORE_COLLECTIONS.CAMPAIGN_SPONSORS), where('campaignId', '==', campaignId)),
  );
  return snap.docs
    .map((d) => ({ ...(d.data() as CampaignSponsor), id: d.id }))
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map((l) => l.sponsorId);
}
