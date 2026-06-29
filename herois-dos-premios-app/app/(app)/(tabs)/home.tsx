import { FIRESTORE_COLLECTIONS, CouponStatus, DrawStatus, formatCoins } from '@herois/shared';
import type { Coupon, Draw } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image, Linking } from 'react-native';

import { fetchActiveBanners } from '@/data/repositories/banner.repository';
import { campaignRepository } from '@/data/repositories/campaign.repository';
import { firestore } from '@/services/firebase/firebase-client';
import { useAuthStore } from '@/store';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const {
    data: campaigns = [],
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['campaigns', 'active', user?.cityId],
    queryFn: () => campaignRepository.findActive({ cityId: user?.cityId }),
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ['coupons', 'active', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const snap = await getDocs(
        query(
          collection(firestore, FIRESTORE_COLLECTIONS.COUPONS),
          where('userId', '==', user.id),
          where('status', '==', CouponStatus.ACTIVE),
          limit(5),
        ),
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Coupon);
    },
    enabled: !!user?.id,
  });

  const { data: draws = [] } = useQuery({
    queryKey: ['draws', 'recent'],
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(firestore, FIRESTORE_COLLECTIONS.DRAWS),
          where('status', 'in', [DrawStatus.OPEN, DrawStatus.DRAWN]),
          orderBy('drawDate', 'desc'),
          limit(5),
        ),
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Draw);
    },
  });

  const { data: banners = [] } = useQuery({
    queryKey: ['banners', user?.cityId, user?.state],
    queryFn: () => fetchActiveBanners(user ?? undefined),
  });

  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = (banners[bannerIndex]?.rotationSeconds ?? 5) * 1000;
    const timer = setTimeout(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, interval);
    return () => clearTimeout(timer);
  }, [banners, bannerIndex]);

  const currentBanner = banners[bannerIndex];

  return (
    <ScrollView
      className="flex-1 bg-secondary"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#e94560" />
      }
    >
      <View className="px-4 pt-16 pb-8">
        <Text className="text-gray-400">Olá, {user?.name?.split(' ')[0] || 'Herói'}!</Text>
        <Text className="text-2xl font-bold text-white mt-1">Heróis dos Prêmios</Text>

        {currentBanner && (
          <TouchableOpacity
            className="mt-6 rounded-xl overflow-hidden"
            onPress={() => {
              if (currentBanner.linkCampaignId) {
                router.push(`/(app)/campaign/${currentBanner.linkCampaignId}`);
              } else if (currentBanner.linkUrl) {
                Linking.openURL(currentBanner.linkUrl);
              }
            }}
          >
            <Image
              source={{ uri: currentBanner.imageUrl }}
              className="w-full h-32"
              resizeMode="cover"
            />
            <Text className="text-white text-sm p-2 bg-black/40 absolute bottom-0 left-0 right-0">
              {currentBanner.title}
            </Text>
          </TouchableOpacity>
        )}

        <View className="bg-accent rounded-xl p-4 mt-6 flex-row justify-between items-center">
          <View>
            <Text className="text-gray-300">Suas Moedas</Text>
            <Text className="text-3xl font-bold text-gold">
              {formatCoins(user?.coinBalance ?? 0)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/wallet')}>
            <Text className="text-primary">Ver histórico →</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-white text-lg font-bold mt-8 mb-4">Campanhas Ativas</Text>
        {campaigns.length === 0 ? (
          <Text className="text-gray-500">Nenhuma campanha ativa no momento</Text>
        ) : (
          campaigns.slice(0, 3).map((campaign) => (
            <TouchableOpacity
              key={campaign.id}
              className="bg-secondary-light rounded-xl p-4 mb-3"
              onPress={() => router.push(`/(app)/campaign/${campaign.id}`)}
            >
              <Text className="text-white font-bold">{campaign.name}</Text>
              <Text className="text-gray-400 text-sm mt-1">{campaign.cityName || 'Nacional'}</Text>
            </TouchableOpacity>
          ))
        )}

        <View className="flex-row justify-between items-center mt-6 mb-4">
          <Text className="text-white text-lg font-bold">Cupons Ativos</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/coupons')}>
            <Text className="text-primary">Ver todos</Text>
          </TouchableOpacity>
        </View>
        {coupons.length === 0 ? (
          <Text className="text-gray-500">Nenhum cupom ativo</Text>
        ) : (
          coupons.map((coupon) => (
            <View key={coupon.id} className="bg-secondary-light rounded-lg p-3 mb-2">
              <Text className="text-primary font-mono font-bold">{coupon.code}</Text>
            </View>
          ))
        )}

        <View className="flex-row justify-between items-center mt-6 mb-4">
          <Text className="text-white text-lg font-bold">Últimos Sorteios</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/draws')}>
            <Text className="text-primary">Ver todos</Text>
          </TouchableOpacity>
        </View>
        {draws.map((draw) => (
          <View key={draw.id} className="bg-secondary-light rounded-lg p-3 mb-2">
            <Text className="text-white font-bold">{draw.name}</Text>
            <Text className="text-gray-400 text-sm">{draw.prizeName}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
