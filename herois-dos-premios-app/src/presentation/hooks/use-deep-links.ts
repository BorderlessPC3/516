import { parseUniversalLinkCampaignId } from '@herois/shared';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { scannerService } from '@/services/scanner/scanner.service';

export function useDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const campaignId = parseUniversalLinkCampaignId(url);
      if (campaignId) {
        router.push(`/(app)/video/${campaignId}`);
        return;
      }

      const result = await scannerService.handleDeepLink(url);
      if (result?.campaignId) {
        if (result.isValid) {
          const startStep = result.metadata?.startStepIndex as number | undefined;
          router.push({
            pathname: '/(app)/video/[campaignId]',
            params: {
              campaignId: result.campaignId,
              ...(startStep != null ? { startStep: String(startStep) } : {}),
            },
          });
        } else {
          router.push(`/(app)/campaign/${result.campaignId}`);
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, [router]);
}
