import * as Location from 'expo-location';
import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { authService } from '@/services/firebase/auth.service';
import { firebaseAuth } from '@/services/firebase/firebase-client';
import { pushNotificationService } from '@/services/push/push.service';
import { usePermissionsStore } from '@/store';

export default function PermissionsScreen() {
  const router = useRouter();
  const setPermission = usePermissionsStore((s) => s.setPermission);
  const [, requestCamera] = useCameraPermissions();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

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
        if (granted) {
          const uid = firebaseAuth.currentUser?.uid;
          if (uid) {
            try {
              const loc = await Location.getCurrentPositionAsync();
              await authService.updateUserProfile(uid, {
                location: {
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                  accuracy: loc.coords.accuracy ?? undefined,
                  updatedAt: new Date().toISOString(),
                },
              });
            } catch {
              // localização indisponível
            }
          }
        }
        return granted;
      },
    },
    {
      title: 'Notificações',
      description: 'Receba alertas de campanhas, sorteios e promoções',
      action: async () => {
        await pushNotificationService.setupAndroidChannel();
        const granted = await pushNotificationService.requestPermission();
        setPermission('notifications', granted);
        const uid = firebaseAuth.currentUser?.uid;
        if (uid) {
          const permissions = usePermissionsStore.getState();
          await authService.updateUserProfile(uid, {
            permissionsGranted: {
              camera: permissions.camera,
              location: permissions.location,
              notifications: granted,
            },
          });
          if (granted) {
            const token = await pushNotificationService.getExpoPushToken();
            if (token) await pushNotificationService.registerToken(token);
          }
        }
        return granted;
      },
    },
  ];

  const handleNext = async () => {
    setLoading(true);
    try {
      const current = steps[step];
      await current.action();

      if (step < steps.length - 1) {
        setStep(step + 1);
      } else {
        router.replace('/(app)/(tabs)/home');
      }
    } finally {
      setLoading(false);
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

      <TouchableOpacity
        className="bg-primary py-4 rounded-lg mb-4"
        onPress={handleNext}
        disabled={loading}
      >
        <Text className="text-white text-center font-bold text-lg">
          {loading ? 'Configurando...' : 'Permitir'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip}>
        <Text className="text-gray-500 text-center">Pular por agora</Text>
      </TouchableOpacity>
    </View>
  );
}
