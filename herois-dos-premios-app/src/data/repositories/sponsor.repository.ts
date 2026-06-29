import { FIRESTORE_COLLECTIONS } from '@herois/shared';
import type { CampaignParticipation } from '@herois/shared';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { firestore, firebaseFunctions } from '@/services/firebase/firebase-client';

export interface SponsorStep {
  sponsorId: string;
  sponsorName: string;
  sequenceOrder: number;
  videoId?: string;
  videoUrl?: string;
  prizeId?: string;
  prizeName?: string;
  socialLinks: Record<string, string>;
}

export async function getCampaignSponsorSteps(campaignId: string): Promise<SponsorStep[]> {
  const fn = httpsCallable(firebaseFunctions, 'getCampaignSponsorSequence');
  const res = await fn({ campaignId });
  const data = res.data as { steps: SponsorStep[] };
  return data.steps ?? [];
}

export async function getCampaignParticipation(
  userId: string,
  campaignId: string,
): Promise<CampaignParticipation | null> {
  const snap = await getDoc(
    doc(firestore, FIRESTORE_COLLECTIONS.CAMPAIGN_PARTICIPATIONS, `${userId}_${campaignId}`),
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CampaignParticipation;
}
