import { FIRESTORE_COLLECTIONS, DrawStatus, formatDateTime, toDate } from '@herois/shared';
import type { Draw } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { View, Text, FlatList } from 'react-native';

import { firestore } from '@/services/firebase/firebase-client';

export default function DrawsScreen() {
  const { data: draws = [] } = useQuery({
    queryKey: ['draws', 'all'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(firestore, FIRESTORE_COLLECTIONS.DRAWS), orderBy('drawDate', 'desc')),
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Draw);
    },
  });

  return (
    <View className="flex-1 bg-secondary pt-16">
      <Text className="text-2xl font-bold text-white px-4 mb-4">Sorteios</Text>
      <FlatList
        data={draws}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-secondary-light rounded-xl p-4 mb-3 mx-4">
            <Text className="text-white font-bold text-lg">{item.name}</Text>
            <Text className="text-gold mt-1">Prêmio: {item.prizeName}</Text>
            <Text className="text-gray-400 text-sm mt-2">
              Sorteio: {formatDateTime(toDate(item.drawDate))}
            </Text>
            <Text
              className={`mt-2 text-sm ${item.status === DrawStatus.DRAWN ? 'text-green-400' : 'text-primary'}`}
            >
              {item.status === DrawStatus.DRAWN
                ? `Ganhador: ${item.winnerName || 'Definido'}`
                : item.status}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text className="text-gray-500 text-center mt-8">Nenhum sorteio</Text>}
      />
    </View>
  );
}
