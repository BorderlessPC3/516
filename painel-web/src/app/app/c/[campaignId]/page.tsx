import type { Metadata } from 'next';

import { CampaignLanding } from '@/components/promo/campaign-landing';

export const metadata: Metadata = {
  title: 'Heróis dos Prêmios — Campanha',
  description: 'Assista ao vídeo e resgate seu cupom para concorrer a prêmios.',
  robots: 'index, follow',
};

export default async function CampaignPublicPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <CampaignLanding campaignId={campaignId} />;
}
