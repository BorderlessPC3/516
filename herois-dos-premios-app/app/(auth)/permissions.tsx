import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { authService } from '@/services/firebase/auth.service';
import { firebaseAuth } from '@/services/firebase/firebase-client';
import { usePermissionsStore } from '@/store';

export default function PermissionsScreen() {
  const router = useRouter();
  const setPermission = usePermissionsStore((s) => s.setPermission);
  const [, requestCamera] = useCameraPermissions();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Câmera',
      description: 'Necessária para escanear QR Codes das campanhas',
      action: async () => {
        const result = await requestCamera();
        setPermission('camera', result.granted);
        return result.granted;
      },
    },
    {
      title: 'Localização',
      description: 'Para campanhas regionais e municipais',
      action: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === 'granted';
        setPermission('location', granted);
        return granted;
      },
    },
    {
      title: 'Notificações',
      description: 'Receba alertas de campanhas, sorteios e promoções',
      action: async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        const granted = status === 'granted';
        setPermission('notifications', granted);
        if (granted) {
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          const uid = firebaseAuth.currentUser?.uid;
          if (uid) {
            await authService.updateUserProfile(uid, {
              permissionsGranted: { camera: true, location: true, notifications: true },
            });
          }
          console.info('[Push] Token registrado:', token);
        }
        return granted;
      },
    },
  ];

  const handleNext = async () => {
    const current = steps[step];
    await current.action();

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      router.replace('/(app)/(tabs)/home');
    }
  };

  const handleSkip = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      router.replace('/(app)/(tabs)/home');
    }
  };

  const current = steps[step];

  return (
    <View className="flex-1 justify-center px-6 bg-secondary">
      <Text className="text-primary text-sm mb-2">
        Passo {step + 1} de {steps.length}
      </Text>
      <Text className="text-3xl font-bold text-white mb-4">{current.title}</Text>
      <Text className="text-gray-400 mb-12">{current.description}</Text>

      <TouchableOpacity className="bg-primary py-4 rounded-lg mb-4" onPress={handleNext}>
        <Text className="text-white text-center font-bold text-lg">Permitir</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip}>
        <Text className="text-gray-500 text-center">Pular por agora</Text>
      </TouchableOpacity>
    </View>
  );
}
