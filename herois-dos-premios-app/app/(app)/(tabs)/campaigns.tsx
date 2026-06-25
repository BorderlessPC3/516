import { formatDate, toDate } from '@herois/shared';
import type { Campaign } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';

import { campaignRepository } from '@/data/repositories/campaign.repository';
import { useAuthStore } from '@/store';

export default function CampaignsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const {
    data: campaigns = [],
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['campaigns', 'all', user?.cityId],
    queryFn: () => campaignRepository.findActive({ cityId: user?.cityId }),
  });

  const renderItem = ({ item }: { item: Campaign }) => (
    <TouchableOpacity
      className="bg-secondary-light rounded-xl p-4 mb-3 mx-4"
      onPress={() => router.push(`/(app)/campaign/${item.id}`)}
    >
      <Text className="text-white font-bold text-lg">{item.name}</Text>
      <Text className="text-gray-400 mt-1">{item.cityName || 'Campanha Nacional'}</Text>
      <Text className="text-gray-500 text-sm mt-2">
        {formatDate(toDate(item.startDate))} - {formatDate(toDate(item.endDate))}
      </Text>
      <Text className="text-gold mt-2">+{item.coinReward} moeda(s)</Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-secondary pt-16">
      <Text className="text-2xl font-bold text-white px-4 mb-4">Campanhas</Text>
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#e94560" />
        }
        ListEmptyComponent={
          <Text className="text-gray-500 text-center mt-8">Nenhuma campanha disponível</Text>
        }
      />
    </View>
  );
}
