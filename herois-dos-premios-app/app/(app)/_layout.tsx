import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="campaign/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="video/[campaignId]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="coupons" />
      <Stack.Screen name="draws" />
      <Stack.Screen name="social/[campaignId]" />
    </Stack>
  );
}
