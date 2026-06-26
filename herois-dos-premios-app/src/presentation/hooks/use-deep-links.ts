import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { scannerService } from '@/services/scanner/scanner.service';

export function useDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const result = await scannerService.handleDeepLink(url);
      if (result?.isValid && result.campaignId) {
        router.push(`/(app)/campaign/${result.campaignId}`);
      } else if (result?.campaignId && !result.isValid) {
        router.push(`/(app)/campaign/${result.campaignId}`);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, [router]);
}
