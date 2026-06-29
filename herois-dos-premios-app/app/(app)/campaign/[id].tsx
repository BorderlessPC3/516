import { CampaignDisplayMode, formatDate, toDate } from '@herois/shared';
import { Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';

import { campaignRepository } from '@/data/repositories/campaign.repository';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignRepository.findById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-secondary items-center justify-center">
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View className="flex-1 bg-secondary items-center justify-center">
        <Text className="text-white">Campanha não encontrada</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-secondary">
      <View className="h-48 bg-accent items-center justify-center overflow-hidden">
        {campaign.bannerUrl ? (
          <Image source={{ uri: campaign.bannerUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Text className="text-6xl">🎯</Text>
        )}
      </View>

      <View className="p-4">
        <Text className="text-2xl font-bold text-white">{campaign.name}</Text>
        <Text className="text-gray-400 mt-2">
          {campaign.cityName || 'Nacional'} • {campaign.scope}
        </Text>
        <Text className="text-gray-500 mt-2">
          {formatDate(toDate(campaign.startDate))} - {formatDate(toDate(campaign.endDate))}
        </Text>

        {campaign.description && <Text className="text-gray-300 mt-4">{campaign.description}</Text>}

        <Text className="text-gold mt-4 font-bold">
          Recompensa: +{campaign.coinReward} moeda(s)
        </Text>

        {campaign.requiredSocialNetworks.length > 0 && (
          <View className="mt-4">
            <Text className="text-white font-bold mb-2">Redes sociais necessárias:</Text>
            {campaign.requiredSocialNetworks.map((network) => (
              <Text key={network} className="text-gray-400">
                • {network}
              </Text>
            ))}
            <TouchableOpacity
              className="bg-secondary-light py-3 rounded-lg mt-3"
              onPress={() => router.push(`/(app)/social/${campaign.id}`)}
            >
              <Text className="text-primary text-center">Confirmar Redes Sociais</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          className="bg-primary py-4 rounded-lg mt-8"
          onPress={() => {
            if (campaign.displayMode === CampaignDisplayMode.AR) {
              Alert.alert(
                'Modo RA em breve',
                'O reconhecimento de imagem (Vuforia) será habilitado em breve. Por enquanto, assista no modo expandido.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Assistir', onPress: () => router.push(`/(app)/video/${campaign.id}`) },
                ],
              );
            } else {
              router.push(`/(app)/video/${campaign.id}`);
            }
          }}
        >
          <Text className="text-white text-center font-bold text-lg">Assistir Vídeo</Text>
        </TouchableOpacity>

        <TouchableOpacity className="mt-4 py-3" onPress={() => router.back()}>
          <Text className="text-gray-400 text-center">Voltar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
