import { phoneLoginSchema, type PhoneLoginInput, withRetry } from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { useNetworkStatus } from '@/hooks/use-network';
import { authService } from '@/services/firebase/auth.service';

export default function LoginScreen() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneLoginInput>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: '+55' },
  });

  const onSubmit = async (data: PhoneLoginInput) => {
    if (!isOnline) {
      Alert.alert('Sem conexão', 'Conecte-se à internet para receber o código.');
      return;
    }

    setLoading(true);
    try {
      await withRetry(() => authService.sendOtp(data.phone), 3);
      router.push({ pathname: '/(auth)/verify-otp', params: { phone: data.phone } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro', message || 'Não foi possível enviar o código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-secondary"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-white mb-2">Bem-vindo!</Text>
        <Text className="text-gray-400 mb-8">Entre com seu WhatsApp</Text>

        {!isOnline && (
          <Text className="text-yellow-400 mb-4 text-center">Você está offline</Text>
        )}

        <Text className="text-white mb-2">Telefone (WhatsApp)</Text>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-secondary-light text-white px-4 py-3 rounded-lg mb-1 border border-gray-700"
              placeholder="+5511999999999"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.phone && <Text className="text-red-400 mb-4">{errors.phone.message}</Text>}

        <TouchableOpacity
          className="bg-primary py-4 rounded-lg mt-4"
          onPress={handleSubmit(onSubmit)}
          disabled={loading || !isOnline}
        >
          <Text className="text-white text-center font-bold text-lg">
            {loading ? 'Enviando...' : 'Receber Código'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="mt-6" onPress={() => router.push('/(auth)/register')}>
          <Text className="text-primary text-center">Não tem conta? Cadastre-se</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
