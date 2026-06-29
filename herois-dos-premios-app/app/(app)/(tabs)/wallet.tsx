import { FIRESTORE_COLLECTIONS, formatDateTime, toDate } from '@herois/shared';
import type { CoinTransaction } from '@herois/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';

import { fetchCoinRewardsCatalog } from '@/data/repositories/wallet.repository';
import { firestore, firebaseFunctions } from '@/services/firebase/firebase-client';
import { authService } from '@/services/firebase/auth.service';
import { useAuthStore } from '@/store';

export default function WalletScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ['coinTransactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const snap = await getDocs(
        query(
          collection(firestore, FIRESTORE_COLLECTIONS.COIN_TRANSACTIONS),
          where('userId', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(50),
        ),
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CoinTransaction);
    },
    enabled: !!user?.id,
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ['coin-rewards-catalog'],
    queryFn: fetchCoinRewardsCatalog,
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const redeem = httpsCallable(firebaseFunctions, 'redeemCoins');
      const res = await redeem({ rewardId });
      return res.data as { rewardName: string; newBalance: number };
    },
    onSuccess: async (data) => {
      Alert.alert('Resgate realizado!', `Você resgatou: ${data.rewardName}`);
      const updated = await authService.getCurrentUser();
      if (updated) setUser(updated);
      queryClient.invalidateQueries({ queryKey: ['coinTransactions'] });
    },
    onError: (err: Error) => {
      Alert.alert('Erro', err.message || 'Não foi possível resgatar.');
    },
  });

  return (
    <View className="flex-1 bg-secondary pt-16">
      <View className="px-4 mb-6">
        <Text className="text-2xl font-bold text-white">Carteira de Moedas</Text>
        <View className="bg-accent rounded-xl p-6 mt-4 items-center">
          <Text className="text-gray-300">Saldo Atual</Text>
          <Text className="text-4xl font-bold text-gold mt-2">{user?.coinBalance ?? 0}</Text>
          <Text className="text-gray-400 mt-1">moedas</Text>
        </View>
      </View>

      {rewards.length > 0 && (
        <View className="px-4 mb-6">
          <Text className="text-white font-bold mb-3">Resgatar com moedas</Text>
          {rewards.map((reward) => (
            <TouchableOpacity
              key={reward.id}
              className="bg-secondary-light rounded-lg p-4 mb-2 flex-row justify-between items-center"
              onPress={() => {
                if ((user?.coinBalance ?? 0) < reward.coinCost) {
                  Alert.alert('Saldo insuficiente', `Você precisa de ${reward.coinCost} moedas.`);
                  return;
                }
                Alert.alert('Confirmar resgate', `Resgatar "${reward.name}" por ${reward.coinCost} moedas?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Resgatar', onPress: () => redeemMutation.mutate(reward.id) },
                ]);
              }}
            >
              <View className="flex-1">
                <Text className="text-white font-bold">{reward.name}</Text>
                {reward.description && (
                  <Text className="text-gray-400 text-sm">{reward.description}</Text>
                )}
              </View>
              <Text className="text-gold font-bold">{reward.coinCost} 🪙</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text className="text-white font-bold px-4 mb-3">Histórico</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-800">
            <View className="flex-1">
              <Text className="text-white">{item.description}</Text>
              <Text className="text-gray-500 text-sm">
                {formatDateTime(toDate(item.createdAt))}
              </Text>
            </View>
            <Text className={`font-bold ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {item.amount > 0 ? '+' : ''}
              {item.amount}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-gray-500 text-center mt-4">Nenhuma transação ainda</Text>
        }
      />
    </View>
  );
}
