import { FIRESTORE_COLLECTIONS, DrawStatus, formatDateTime, toDate } from '@herois/shared';
import type { Draw } from '@herois/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';

import { firestore, firebaseFunctions } from '@/services/firebase/firebase-client';
import { useAuthStore } from '@/store';

export default function DrawsScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: draws = [] } = useQuery({
    queryKey: ['draws', 'all'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(firestore, FIRESTORE_COLLECTIONS.DRAWS), orderBy('drawDate', 'desc')),
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Draw);
    },
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ['draw-participations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const snap = await getDocs(
        query(
          collection(firestore, FIRESTORE_COLLECTIONS.DRAW_PARTICIPANTS),
          where('userId', '==', user.id),
        ),
      );
      return snap.docs.map((d) => d.data().drawId as string);
    },
    enabled: !!user?.id,
  });

  const participateMutation = useMutation({
    mutationFn: async (drawId: string) => {
      const participate = httpsCallable(firebaseFunctions, 'participateInDraw');
      await participate({ drawId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draw-participations'] });
      Alert.alert('Sucesso', 'Participação registrada!');
    },
    onError: (error: Error) => {
      Alert.alert('Erro', error.message || 'Não foi possível participar.');
    },
  });

  return (
    <View className="flex-1 bg-secondary pt-16">
      <Text className="text-2xl font-bold text-white px-4 mb-4">Sorteios</Text>
      <FlatList
        data={draws}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isParticipating = myParticipations.includes(item.id);
          const isWinner = item.winnerUserIds?.includes(user?.id ?? '') || item.winnerUserId === user?.id;
          const canParticipate =
            (item.status === DrawStatus.OPEN || item.status === DrawStatus.SCHEDULED) &&
            !isParticipating;

          return (
            <View className="bg-secondary-light rounded-xl p-4 mb-3 mx-4">
              <Text className="text-white font-bold text-lg">{item.name}</Text>
              <Text className="text-gold mt-1">Prêmio: {item.prizeName}</Text>
              <Text className="text-gray-400 text-sm mt-2">
                Sorteio: {formatDateTime(toDate(item.drawDate))}
              </Text>
              <Text className="text-gray-500 text-sm">
                Participantes: {item.participantCount} • Vencedores: {item.winnerCount ?? 1}
              </Text>
              {item.minCoinsRequired ? (
                <Text className="text-gray-500 text-sm">
                  Mínimo: {item.minCoinsRequired} moedas
                </Text>
              ) : null}
              <Text
                className={`mt-2 text-sm ${isWinner ? 'text-green-400' : 'text-primary'}`}
              >
                {isWinner
                  ? '🏆 Você ganhou!'
                  : item.status === DrawStatus.DRAWN
                    ? `Ganhador: ${item.winnerName || 'Definido'}`
                    : item.status}
              </Text>
              {canParticipate && (
                <TouchableOpacity
                  className="bg-primary py-3 rounded-lg mt-3"
                  onPress={() => participateMutation.mutate(item.id)}
                  disabled={participateMutation.isPending}
                >
                  <Text className="text-white text-center font-bold">Participar</Text>
                </TouchableOpacity>
              )}
              {isParticipating && !isWinner && item.status !== DrawStatus.DRAWN && (
                <Text className="text-green-400 text-sm mt-2">✓ Você está participando</Text>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text className="text-gray-500 text-center mt-8">Nenhum sorteio</Text>}
      />
    </View>
  );
}
