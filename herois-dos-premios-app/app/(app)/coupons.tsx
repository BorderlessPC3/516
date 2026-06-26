import { FIRESTORE_COLLECTIONS, CouponStatus, formatDate, toDate } from '@herois/shared';
import type { Coupon, Draw } from '@herois/shared';
import { useQuery, useMutation } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';

import { firestore, firebaseFunctions } from '@/services/firebase/firebase-client';
import { useAuthStore } from '@/store';

export default function CouponsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: coupons = [] } = useQuery({
    queryKey: ['coupons', 'all', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const snap = await getDocs(
        query(
          collection(firestore, FIRESTORE_COLLECTIONS.COUPONS),
          where('userId', '==', user.id),
          orderBy('validUntil', 'desc'),
        ),
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Coupon);
    },
    enabled: !!user?.id,
  });

  const renderCoupon = (item: Coupon) => {
    const isExpired = item.status === CouponStatus.EXPIRED || toDate(item.validUntil) < new Date();
    const isUsed = item.status === CouponStatus.USED;

    return (
      <TouchableOpacity
        className="bg-secondary-light rounded-xl p-4 mb-3 mx-4"
        onPress={() => router.push(`/(app)/coupon/${item.id}`)}
      >
        <Text className="text-primary font-mono font-bold text-lg">{item.code}</Text>
        <Text className="text-white mt-1">{item.campaignName || 'Campanha'}</Text>
        {item.prizeName && <Text className="text-gold text-sm mt-1">Prêmio: {item.prizeName}</Text>}
        <Text className="text-gray-500 text-sm mt-2">
          Válido até {formatDate(toDate(item.validUntil))}
        </Text>
        <Text
          className={`mt-1 text-sm ${
            item.status === CouponStatus.ACTIVE && !isExpired
              ? 'text-green-400'
              : isUsed
                ? 'text-blue-400'
                : 'text-gray-500'
          }`}
        >
          {isUsed ? 'UTILIZADO' : isExpired ? 'EXPIRADO' : item.status}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-secondary pt-16">
      <Text className="text-2xl font-bold text-white px-4 mb-4">Meus Cupons</Text>
      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderCoupon(item)}
        ListEmptyComponent={<Text className="text-gray-500 text-center mt-8">Nenhum cupom</Text>}
      />
    </View>
  );
}
