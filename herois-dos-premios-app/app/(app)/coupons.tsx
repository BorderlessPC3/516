import { FIRESTORE_COLLECTIONS, CouponStatus, formatDate, toDate } from '@herois/shared';
import type { Coupon } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { View, Text, FlatList } from 'react-native';

import { firestore } from '@/services/firebase/firebase-client';
import { useAuthStore } from '@/store';

export default function CouponsScreen() {
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

  const active = coupons.filter((c) => c.status === CouponStatus.ACTIVE);
  const expired = coupons.filter(
    (c) => c.status === CouponStatus.EXPIRED || c.status === CouponStatus.USED,
  );

  const renderCoupon = (item: Coupon) => (
    <View className="bg-secondary-light rounded-xl p-4 mb-3 mx-4">
      <Text className="text-primary font-mono font-bold text-lg">{item.code}</Text>
      <Text className="text-white mt-1">{item.campaignName || 'Campanha'}</Text>
      <Text className="text-gray-500 text-sm mt-2">
        Válido até {formatDate(toDate(item.validUntil))}
      </Text>
      <Text
        className={`mt-1 text-sm ${item.status === CouponStatus.ACTIVE ? 'text-green-400' : 'text-gray-500'}`}
      >
        {item.status}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-secondary pt-16">
      <Text className="text-2xl font-bold text-white px-4 mb-4">Meus Cupons</Text>

      <Text className="text-white font-bold px-4 mb-2">Ativos ({active.length})</Text>
      <FlatList
        data={[...active, ...expired]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderCoupon(item)}
        ListEmptyComponent={<Text className="text-gray-500 text-center mt-8">Nenhum cupom</Text>}
      />
    </View>
  );
}
