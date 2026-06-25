import {
  userRegistrationSchema,
  type UserRegistrationInput,
  FIRESTORE_COLLECTIONS,
} from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { authService } from '@/services/firebase/auth.service';
import { firestore } from '@/services/firebase/firebase-client';

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<{ id: string; name: string; state: string }[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserRegistrationInput>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: { phone: '+55', name: '', birthDate: '', cityId: '' },
  });

  const loadCities = async () => {
    const snap = await getDocs(
      query(collection(firestore, FIRESTORE_COLLECTIONS.CITIES), where('isActive', '==', true)),
    );
    setCities(snap.docs.map((d) => ({ id: d.id, name: d.data().name, state: d.data().state })));
  };

  useEffect(() => {
    loadCities();
  }, []);

  const onSubmit = async (data: UserRegistrationInput) => {
    setLoading(true);
    try {
      await authService.sendOtp(data.phone);
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: data.phone, register: 'true', ...data },
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-secondary"
    >
      <ScrollView className="flex-1 px-6 pt-16">
        <Text className="text-3xl font-bold text-white mb-2">Cadastro</Text>
        <Text className="text-gray-400 mb-8">Crie sua conta para participar</Text>

        {(['name', 'phone', 'birthDate'] as const).map((field) => (
          <View key={field} className="mb-4">
            <Text className="text-white mb-2">
              {field === 'name'
                ? 'Nome'
                : field === 'phone'
                  ? 'WhatsApp'
                  : 'Data de Nascimento (AAAA-MM-DD)'}
            </Text>
            <Controller
              control={control}
              name={field}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="bg-secondary-light text-white px-4 py-3 rounded-lg border border-gray-700"
                  placeholderTextColor="#666"
                  keyboardType={field === 'phone' ? 'phone-pad' : 'default'}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors[field] && <Text className="text-red-400 mt-1">{errors[field]?.message}</Text>}
          </View>
        ))}

        <Text className="text-white mb-2">Cidade</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {cities.map((city) => (
            <TouchableOpacity
              key={city.id}
              className={`mr-2 px-4 py-2 rounded-full ${watch('cityId') === city.id ? 'bg-primary' : 'bg-secondary-light'}`}
              onPress={() => setValue('cityId', city.id)}
            >
              <Text className="text-white">
                {city.name} - {city.state}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {errors.cityId && <Text className="text-red-400 mb-4">{errors.cityId.message}</Text>}

        <TouchableOpacity
          className="bg-primary py-4 rounded-lg"
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          <Text className="text-white text-center font-bold text-lg">
            {loading ? 'Enviando...' : 'Cadastrar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="mt-6 mb-10" onPress={() => router.back()}>
          <Text className="text-primary text-center">Já tem conta? Entrar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
