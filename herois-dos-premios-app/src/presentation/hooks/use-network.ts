import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const NetInfo = await import('@react-native-community/netinfo');
        const state = await NetInfo.default.fetch();
        if (mounted) setIsOnline(state.isConnected ?? true);

        const unsubscribe = NetInfo.default.addEventListener((s) => {
          setIsOnline(s.isConnected ?? true);
        });
        return unsubscribe;
      } catch {
        if (mounted) setIsOnline(true);
        return undefined;
      }
    };

    let unsubscribe: (() => void) | undefined;
    check().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  return { isOnline };
}
