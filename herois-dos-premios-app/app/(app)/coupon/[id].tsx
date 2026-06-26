import { CouponStatus, FIRESTORE_COLLECTIONS, formatDate, toDate } from '@herois/shared';
import type { Coupon } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { View, Text, ScrollView } from 'react-native';

import { firestore } from '@/services/firebase/firebase-client';

export default function CouponDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: coupon, isLoading } = useQuery({
    queryKey: ['coupon', id],
    queryFn: async () => {
      const snap = await getDoc(doc(firestore, FIRESTORE_COLLECTIONS.COUPONS, id!));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Coupon;
    },
    enabled: !!id,
  });

  if (isLoading || !coupon) {
    return (
      <View className="flex-1 bg-secondary items-center justify-center">
        <Text className="text-white">{isLoading ? 'Carregando...' : 'Cupom não encontrado'}</Text>
      </View>
    );
  }

  const isExpired = coupon.status === CouponStatus.EXPIRED || toDate(coupon.validUntil) < new Date();

  return (
    <ScrollView className="flex-1 bg-secondary pt-16 px-4">
      <Text className="text-2xl font-bold text-white mb-6">Detalhes do Cupom</Text>

      <View className="bg-secondary-light rounded-xl p-6 items-center mb-6">
        <Text className="text-6xl mb-4">🎟️</Text>
        <Text className="text-primary font-mono font-bold text-2xl">{coupon.code}</Text>
        <Text className="text-gray-400 mt-2">QR: {coupon.qrPayload || `HP:COUPON:${coupon.id}`}</Text>
      </View>

      <View className="bg-secondary-light rounded-xl p-4 mb-4">
        <Text className="text-gray-400">Campanha</Text>
        <Text className="text-white font-bold">{coupon.campaignName || coupon.campaignId}</Text>
      </View>

      {coupon.prizeName && (
        <View className="bg-secondary-light rounded-xl p-4 mb-4">
          <Text className="text-gray-400">Prêmio</Text>
          <Text className="text-gold font-bold">{coupon.prizeName}</Text>
        </View>
      )}

      <View className="bg-secondary-light rounded-xl p-4 mb-4">
        <Text className="text-gray-400">Validade</Text>
        <Text className="text-white">
          {formatDate(toDate(coupon.validFrom))} até {formatDate(toDate(coupon.validUntil))}
        </Text>
      </View>

      <View className="bg-secondary-light rounded-xl p-4 mb-4">
        <Text className="text-gray-400">Status</Text>
        <Text
          className={
            coupon.status === CouponStatus.ACTIVE && !isExpired ? 'text-green-400' : 'text-gray-400'
          }
        >
          {isExpired ? 'EXPIRADO' : coupon.status}
        </Text>
      </View>

      {coupon.rules && (
        <View className="bg-secondary-light rounded-xl p-4 mb-8">
          <Text className="text-gray-400 mb-2">Regras</Text>
          <Text className="text-white">{coupon.rules}</Text>
        </View>
      )}
    </ScrollView>
  );
}
