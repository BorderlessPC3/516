import { Stack } from 'expo-router';

import { FirebaseRecaptchaProvider } from '@/presentation/components/FirebaseRecaptchaProvider';

export default function AuthLayout() {
  return (
    <FirebaseRecaptchaProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="verify-otp" />
        <Stack.Screen name="permissions" />
      </Stack>
    </FirebaseRecaptchaProvider>
  );
}
