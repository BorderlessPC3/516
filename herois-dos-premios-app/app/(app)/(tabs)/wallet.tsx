import { FIRESTORE_COLLECTIONS, formatDateTime, toDate } from '@herois/shared';
import type { CoinTransaction } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { View, Text, FlatList } from 'react-native';

import { firestore } from '@/services/firebase/firebase-client';
import { useAuthStore } from '@/store';

export default function WalletScreen() {
  const user = useAuthStore((s) => s.user);

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
