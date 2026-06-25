import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';

import { scannerService } from '@/services/scanner/scanner.service';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

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

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const result = scannerService.parseQRCodePayload(data);

    if (result.campaignId) {
      router.push(`/(app)/campaign/${result.campaignId}`);
    } else {
      Alert.alert('QR Code', `Conteúdo: ${data}`, [
        { text: 'Escanear novamente', onPress: () => setScanned(false) },
      ]);
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
      </View>
      {scanned && (
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
