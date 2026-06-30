import { withRetry } from '@herois/shared';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';

import { useNetworkStatus } from '@/hooks/use-network';
import { authService } from '@/services/firebase/auth.service';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const params = useLocalSearchParams<{
    phone: string;
    register?: string;
    name?: string;
    email?: string;
    birthDate?: string;
    referredBy?: string;
  }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Erro', 'Digite o código de 6 dígitos');
      return;
    }

    if (!isOnline) {
      Alert.alert('Sem conexão', 'Conecte-se à internet para verificar o código.');
      return;
    }

    setLoading(true);
    try {
      const { uid } = await withRetry(() => authService.verifyOtp(params.phone!, code), 3);

      if (params.register === 'true' && params.name && params.email) {
        await authService.createUserProfile(uid, {
          name: params.name,
          phone: params.phone!,
          email: params.email,
          birthDate: params.birthDate || '',
          referredBy: params.referredBy,
        });
        router.replace('/(auth)/permissions');
      } else {
        const existing = await authService.getCurrentUser();
        if (!existing) {
          Alert.alert('Conta não encontrada', 'Complete seu cadastro primeiro.', [
            { text: 'Cadastrar', onPress: () => router.replace('/(auth)/register') },
          ]);
          return;
        }
        router.replace('/(app)/(tabs)/home');
      }
    } catch {
      Alert.alert('Erro', 'Código inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isOnline) return;
    setLoading(true);
    try {
      await withRetry(() => authService.sendOtp(params.phone!), 3);
      Alert.alert('Código reenviado', 'Verifique seu WhatsApp.');
    } catch {
      Alert.alert('Erro', 'Não foi possível reenviar o código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-secondary">
      <Text className="text-3xl font-bold text-white mb-2">Verificação</Text>
      <Text className="text-gray-400 mb-8">Digite o código enviado para {params.phone}</Text>

      <TextInput
        className="bg-secondary-light text-white px-4 py-3 rounded-lg text-center text-2xl tracking-widest border border-gray-700 mb-6"
        placeholder="000000"
        placeholderTextColor="#666"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />

      <TouchableOpacity
        className="bg-primary py-4 rounded-lg"
        onPress={handleVerify}
        disabled={loading}
      >
        <Text className="text-white text-center font-bold text-lg">
          {loading ? 'Verificando...' : 'Confirmar'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="mt-4 py-3" onPress={handleResend} disabled={loading}>
        <Text className="text-primary text-center">Reenviar código</Text>
      </TouchableOpacity>
    </View>
  );
}
