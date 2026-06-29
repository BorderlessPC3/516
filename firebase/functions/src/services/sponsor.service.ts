import { FIRESTORE_COLLECTIONS, VideoProcessingStatus } from '@herois/shared';
import type { Firestore } from 'firebase-admin/firestore';

export interface CampaignSponsorStep {
  sponsorId: string;
  sponsorName: string;
  sequenceOrder: number;
  videoId?: string;
  videoUrl?: string;
  prizeId?: string;
  prizeName?: string;
  socialLinks: Record<string, string>;
}

export async function getCampaignSponsorSteps(
  db: Firestore,
  campaignId: string,
): Promise<CampaignSponsorStep[]> {
  const linksSnap = await db
    .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_SPONSORS)
    .where('campaignId', '==', campaignId)
    .get();

  if (linksSnap.empty) {
    const videosSnap = await db
      .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS)
      .where('campaignId', '==', campaignId)
      .where('processingStatus', '==', VideoProcessingStatus.READY)
      .get();

    return videosSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          sponsorId: d.id,
          sponsorName: (data.title as string) ?? 'Vídeo',
          sequenceOrder: (data.sequenceOrder as number) ?? 0,
          videoId: d.id,
          videoUrl:
            (data.cloudFrontUrl as string) ||
            (data.processedUrl as string) ||
            (data.originalUrl as string),
          prizeId: undefined,
          prizeName: undefined,
          socialLinks: {},
        };
      })
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }

  const steps: CampaignSponsorStep[] = [];

  for (const linkDoc of linksSnap.docs) {
    const link = linkDoc.data();
    const sponsorSnap = await db
      .collection(FIRESTORE_COLLECTIONS.SPONSORS)
      .doc(link.sponsorId as string)
      .get();
    if (!sponsorSnap.exists) continue;

    const sponsor = sponsorSnap.data()!;
    let videoUrl: string | undefined;

    if (sponsor.videoId) {
      const videoSnap = await db
        .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS)
        .doc(sponsor.videoId as string)
        .get();
      if (videoSnap.exists) {
        const v = videoSnap.data()!;
        videoUrl =
          (v.cloudFrontUrl as string) || (v.processedUrl as string) || (v.originalUrl as string);
      }
    }

    steps.push({
      sponsorId: link.sponsorId as string,
      sponsorName: (sponsor.name as string) ?? (link.sponsorName as string),
      sequenceOrder: (link.sequenceOrder as number) ?? 0,
      videoId: sponsor.videoId as string | undefined,
      videoUrl,
      prizeId: sponsor.prizeId as string | undefined,
      prizeName: sponsor.prizeName as string | undefined,
      socialLinks: (sponsor.socialLinks as Record<string, string>) ?? {},
    });
  }

  return steps.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
}

export async function resolveSponsorCampaignId(
  db: Firestore,
  sponsorId: string,
): Promise<string | undefined> {
  const linkSnap = await db
    .collection(FIRESTORE_COLLECTIONS.CAMPAIGN_SPONSORS)
    .where('sponsorId', '==', sponsorId)
    .limit(1)
    .get();

  if (!linkSnap.empty) {
    return linkSnap.docs[0].data().campaignId as string;
  }
  return undefined;
}
