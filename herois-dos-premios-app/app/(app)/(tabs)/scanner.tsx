import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';

import { useNetworkStatus } from '@/hooks/use-network';
import { scannerService } from '@/services/scanner/scanner.service';

export default function ScannerScreen() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission?.granted) {
    return (
      <View className="flex-1 bg-secondary items-center justify-center px-6">
        <Text className="text-white text-center mb-4">
          Precisamos de acesso à câmera para escanear QR Codes
        </Text>
        <TouchableOpacity className="bg-primary px-6 py-3 rounded-lg" onPress={requestPermission}>
          <Text className="text-white font-bold">Permitir Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || validating) return;
    setScanned(true);
    setValidating(true);

    if (!isOnline) {
      Alert.alert('Sem conexão', 'Conecte-se à internet para validar o QR Code.', [
        { text: 'OK', onPress: () => { setScanned(false); setValidating(false); } },
      ]);
      return;
    }

    try {
      let location: { latitude: number; longitude: number } | undefined;
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      }

      const deviceId = Application.getAndroidId?.() ?? Application.applicationId ?? undefined;
      const result = await scannerService.validateAndRegisterScan(data, { location, deviceId });

      if (result.isValid && result.campaignId) {
        const sponsorId = result.metadata?.sponsorId as string | undefined;
        const startStep = result.metadata?.startStepIndex as number | undefined;
        if (sponsorId) {
          router.push({
            pathname: '/(app)/video/[campaignId]',
            params: { campaignId: result.campaignId, startStep: String(startStep ?? 0) },
          });
        } else {
          router.push(`/(app)/campaign/${result.campaignId}`);
        }
      } else {
        Alert.alert(
          'QR Code inválido',
          (result.metadata?.message as string) || 'Este QR Code não pode ser utilizado.',
          [{ text: 'Escanear novamente', onPress: () => setScanned(false) }],
        );
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível validar o QR Code. Tente novamente.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    } finally {
      setValidating(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View className="absolute inset-0 items-center justify-center">
        <View className="w-64 h-64 border-2 border-primary rounded-lg" />
        <Text className="text-white mt-8 text-center px-6">Aponte para o QR Code da campanha</Text>
        {!isOnline && (
          <Text className="text-yellow-400 mt-4 text-center px-6">Modo offline — validação indisponível</Text>
        )}
      </View>
      {validating && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center">
          <ActivityIndicator size="large" color="#e94560" />
          <Text className="text-white mt-4">Validando QR Code...</Text>
        </View>
      )}
      {scanned && !validating && (
        <TouchableOpacity
          className="absolute bottom-10 self-center bg-primary px-8 py-3 rounded-lg"
          onPress={() => setScanned(false)}
        >
          <Text className="text-white font-bold">Escanear Novamente</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
