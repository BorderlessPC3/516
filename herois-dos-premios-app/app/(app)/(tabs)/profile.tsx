import {
  userProfileUpdateSchema,
  type UserProfileUpdateInput,
  formatPhone,
} from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';

import { authService } from '@/services/firebase/auth.service';
import { useAuthStore } from '@/store';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<UserProfileUpdateInput>({
    resolver: zodResolver(userProfileUpdateSchema),
    defaultValues: { name: user?.name, email: user?.email },
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name, email: user.email });
    }
  }, [user, reset]);

  const onSubmit = async (data: UserProfileUpdateInput) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await authService.updateUserProfile(user.id, {
        ...data,
        ...(data.email ? { email: data.email.trim().toLowerCase() } : {}),
      });
      const updated = await authService.getCurrentUser();
      if (updated) setUser(updated);
      Alert.alert('Sucesso', 'Perfil atualizado!');
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView className="flex-1 bg-secondary pt-16 px-4">
      <Text className="text-2xl font-bold text-white mb-6">Meu Perfil</Text>

      <Text className="text-gray-400 mb-1">WhatsApp</Text>
      <Text className="text-white mb-4">{formatPhone(user?.phone || '')}</Text>

      <Text className="text-white mb-2">Nome</Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="bg-secondary-light text-white px-4 py-3 rounded-lg border border-gray-700 mb-4"
            value={value}
            onChangeText={onChange}
          />
        )}
      />

      <Text className="text-white mb-2">E-mail</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="bg-secondary-light text-white px-4 py-3 rounded-lg border border-gray-700 mb-6"
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}
      />

      <TouchableOpacity
        className="bg-primary py-4 rounded-lg mb-4"
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        <Text className="text-white text-center font-bold">
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="border border-red-500 py-4 rounded-lg mb-10"
        onPress={handleLogout}
      >
        <Text className="text-red-500 text-center font-bold">Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
