import { useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

import { firebaseFunctions } from '@/services/firebase/firebase-client';
import { authService } from '@/services/firebase/auth.service';
import { useAuthStore } from '@/store';

export default function ScratchCardScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [prize, setPrize] = useState<{ name: string; description?: string } | null>(null);

  const handleScratch = async () => {
    setLoading(true);
    try {
      const claim = httpsCallable(firebaseFunctions, 'claimScratchCard');
      const res = await claim({});
      const data = res.data as { prize: { name: string; description?: string } };
      setPrize(data.prize);
      setRevealed(true);
      const user = await authService.getCurrentUser();
      if (user) setUser(user);
    } catch {
      setPrize({ name: 'Brinde surpresa!', description: 'Retire na pizzaria parceira.' });
      setRevealed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.replace('/(app)/(tabs)/home');
  };

  return (
    <View className="flex-1 bg-secondary justify-center px-6">
      <Text className="text-3xl font-bold text-white text-center mb-2">🎉 Bem-vindo!</Text>
      <Text className="text-gray-400 text-center mb-10">
        Você ganhou uma raspadinha de boas-vindas. Raspe para descobrir seu prêmio!
      </Text>

      <View className="bg-accent rounded-2xl p-8 items-center mb-8 min-h-[200px] justify-center">
        {!revealed ? (
          <>
            <Text className="text-6xl mb-4">✨</Text>
            <Text className="text-gray-300 text-center">Toque para raspar</Text>
          </>
        ) : (
          <>
            <Text className="text-6xl mb-4">🎁</Text>
            <Text className="text-gold font-bold text-2xl text-center">{prize?.name}</Text>
            {prize?.description && (
              <Text className="text-gray-400 text-center mt-2">{prize.description}</Text>
            )}
          </>
        )}
      </View>

      {!revealed ? (
        <TouchableOpacity
          className="bg-primary py-4 rounded-lg"
          onPress={handleScratch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">Raspar Agora!</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity className="bg-primary py-4 rounded-lg" onPress={handleContinue}>
          <Text className="text-white text-center font-bold text-lg">Continuar para o App</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
