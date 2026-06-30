import { userRegistrationSchema, type UserRegistrationInput, normalizePhone } from '@herois/shared';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthGoldButton } from '@/presentation/components/auth/AuthGoldButton';
import { AuthGoldInput } from '@/presentation/components/auth/AuthGoldInput';
import { AuthScarletBackground } from '@/presentation/components/auth/AuthScarletBackground';
import { AuthWaveHeader } from '@/presentation/components/auth/AuthWaveHeader';
import { authService } from '@/services/firebase/auth.service';

const TERMS_URL = 'https://heroisdospremios.com.br/termos';
const PRIVACY_URL = 'https://heroisdospremios.com.br/privacidade';

function maskBirthDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function birthDateToIso(value: string): string | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function formatWhatsAppInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits.length) return '';
  if (digits.startsWith('55')) return `+${digits.slice(0, 13)}`;
  return `+55${digits.slice(0, 11)}`;
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [birthDateDisplay, setBirthDateDisplay] = useState('');

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UserRegistrationInput>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: { phone: '', name: '', email: '', birthDate: '' },
  });

  const onSubmit = async (data: UserRegistrationInput) => {
    if (!acceptedTerms) {
      Alert.alert('Termos', 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }

    setLoading(true);
    try {
      const phone = normalizePhone(data.phone);
      await authService.sendOtp(phone);
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          phone,
          register: 'true',
          name: data.name,
          email: data.email,
          birthDate: data.birthDate,
        },
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o código.');
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Link indisponível', 'Não foi possível abrir o link no momento.');
    });
  };

  return (
    <AuthScarletBackground>
      <AuthWaveHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{
            paddingTop: 0,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            className="text-center text-white font-extrabold mb-2"
            style={{ fontSize: 26, letterSpacing: 1.5 }}
          >
            CRIAR CONTA
          </Text>
          <Text className="text-center text-white/70 text-sm mb-8 px-4">
            Preencha os dados abaixo para se cadastrar
          </Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <AuthGoldInput
                icon={<Feather name="user" size={20} color="#D4AF37" />}
                placeholder="Nome completo"
                autoCapitalize="words"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.name && <Text className="text-red-400 -mt-2 mb-3 text-sm">{errors.name.message}</Text>}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <AuthGoldInput
                icon={<Feather name="mail" size={20} color="#D4AF37" />}
                placeholder="E-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.email && <Text className="text-red-400 -mt-2 mb-3 text-sm">{errors.email.message}</Text>}

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <AuthGoldInput
                icon={<FontAwesome5 name="whatsapp" size={20} color="#D4AF37" />}
                placeholder="Whatsapp"
                keyboardType="phone-pad"
                value={value}
                onChangeText={(text) => onChange(formatWhatsAppInput(text))}
              />
            )}
          />
          {errors.phone && <Text className="text-red-400 -mt-2 mb-3 text-sm">{errors.phone.message}</Text>}

          <AuthGoldInput
            icon={<MaterialCommunityIcons name="calendar-month-outline" size={20} color="#D4AF37" />}
            placeholder="Data de nascimento"
            keyboardType="number-pad"
            value={birthDateDisplay}
            onChangeText={(text) => {
              const masked = maskBirthDate(text);
              setBirthDateDisplay(masked);
              const iso = birthDateToIso(masked);
              setValue('birthDate', iso ?? '', { shouldValidate: !!iso });
            }}
          />
          {errors.birthDate && (
            <Text className="text-red-400 -mt-2 mb-3 text-sm">{errors.birthDate.message}</Text>
          )}

          <Pressable
            className="flex-row items-start mb-6 mt-1"
            onPress={() => setAcceptedTerms((v) => !v)}
          >
            <View
              className="w-5 h-5 rounded border border-gold mr-3 mt-0.5 items-center justify-center"
              style={{ backgroundColor: acceptedTerms ? '#D4AF37' : 'transparent' }}
            >
              {acceptedTerms && <Feather name="check" size={14} color="#2A0505" />}
            </View>
            <Text className="flex-1 text-white/80 text-sm leading-5">
              Eu concordo com os{' '}
              <Text className="text-gold font-bold" onPress={() => openLink(TERMS_URL)}>
                Termos de Uso
              </Text>{' '}
              e com a{' '}
              <Text className="text-gold font-bold" onPress={() => openLink(PRIVACY_URL)}>
                Política de Privacidade
              </Text>
            </Text>
          </Pressable>

          <AuthGoldButton
            label="CADASTRAR"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
          />

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-white/20" />
            <Text className="mx-4 text-white/60 text-sm font-semibold">OU</Text>
            <View className="flex-1 h-px bg-white/20" />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace('/(auth)/login')}
            className="flex-row items-center justify-center rounded-xl border border-gold py-4 px-4"
            style={{ backgroundColor: 'transparent' }}
          >
            <Feather name="user-plus" size={18} color="#D4AF37" style={{ marginRight: 10 }} />
            <Text
              className="text-gold font-bold text-center"
              style={{ fontSize: 13, letterSpacing: 0.5 }}
            >
              JÁ TEM UMA CONTA? FAZER LOGIN
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScarletBackground>
  );
}
