import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import { useDeepLinks } from '@/hooks/use-deep-links';
import { useAuthStore } from '@/store';

SplashScreen.preventAutoHideAsync();

export default function SplashScreenPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  useDeepLinks();

  useEffect(() => {
    if (isLoading) return;

    const navigate = async () => {
      await SplashScreen.hideAsync();

      if (isAuthenticated) {
        router.replace('/(app)/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    };

    const timer = setTimeout(navigate, 1500);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, router]);

  return (
    <View className="flex-1 items-center justify-center bg-secondary">
      <Text className="text-4xl font-bold text-primary mb-2">🏆</Text>
      <Text className="text-2xl font-bold text-white">Heróis dos Prêmios</Text>
      <ActivityIndicator size="large" color="#e94560" className="mt-8" />
    </View>
  );
}
