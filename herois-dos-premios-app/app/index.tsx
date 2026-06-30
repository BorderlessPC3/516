import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import { HeroTrophyLogo } from '@/presentation/components/brand/HeroTrophyLogo';
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
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#2A0505' }}>
      <HeroTrophyLogo size={120} style={{ marginBottom: 16 }} />
      <Text
        className="text-white font-extrabold"
        style={{ fontSize: 22, letterSpacing: 1 }}
      >
        Heróis dos Prêmios
      </Text>
      <ActivityIndicator size="large" color="#D4AF37" className="mt-8" />
    </View>
  );
}
