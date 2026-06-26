import { FIRESTORE_COLLECTIONS, SocialNetwork } from '@herois/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Share } from 'react-native';

import { campaignRepository } from '@/data/repositories/campaign.repository';
import { firestore, firebaseAuth } from '@/services/firebase/firebase-client';

const NETWORKS = [
  { key: SocialNetwork.INSTAGRAM, label: 'Instagram', icon: '📸' },
  { key: SocialNetwork.FACEBOOK, label: 'Facebook', icon: '👤' },
  { key: SocialNetwork.TIKTOK, label: 'TikTok', icon: '🎵' },
  { key: SocialNetwork.WHATSAPP, label: 'WhatsApp', icon: '💬' },
];

export default function SocialActionsScreen() {
  const router = useRouter();
  const { campaignId, completed, couponId } = useLocalSearchParams<{
    campaignId: string;
    completed?: string;
    couponId?: string;
  }>();
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const isCompletedFlow = completed === 'true';

  const handleConfirm = async (network: SocialNetwork) => {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid || !campaignId) return;

    const actionId = `${uid}_${campaignId}_${network}`;
    await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.SOCIAL_ACTIONS, actionId), {
      userId: uid,
      campaignId,
      network,
      confirmed: true,
      confirmedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setConfirmed((prev) => new Set([...prev, network]));
    Alert.alert('Confirmado', `Ação no ${network} registrada com sucesso!`);
  };

  const handleShare = async () => {
    const campaign = await campaignRepository.findById(campaignId!);
    await Share.share({
      message: `Acabei de completar a campanha "${campaign?.name}" no Heróis dos Prêmios! 🏆 Baixe o app e participe também!`,
      title: 'Heróis dos Prêmios',
    });
  };

  const handleNext = () => {
    router.replace('/(app)/(tabs)/campaigns');
  };

  return (
    <View className="flex-1 bg-secondary pt-16 px-4">
      {isCompletedFlow ? (
        <>
          <Text className="text-3xl font-bold text-white mb-2">🎉 Parabéns!</Text>
          <Text className="text-gray-400 mb-4">
            Campanha concluída! Suas moedas foram creditadas.
            {couponId ? ' Seu cupom está disponível em Meus Cupons.' : ''}
          </Text>
          <TouchableOpacity className="bg-primary py-4 rounded-lg mb-4" onPress={handleShare}>
            <Text className="text-white text-center font-bold text-lg">Compartilhar Conquista</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-secondary-light py-4 rounded-lg mb-8" onPress={handleNext}>
            <Text className="text-primary text-center font-bold">Próxima Campanha</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text className="text-2xl font-bold text-white mb-2">Redes Sociais</Text>
          <Text className="text-gray-400 mb-8">
            Confirme que você seguiu/compartilhou nas redes exigidas
          </Text>
        </>
      )}

      {NETWORKS.map(({ key, label, icon }) => (
        <TouchableOpacity
          key={key}
          className={`flex-row items-center p-4 rounded-xl mb-3 ${confirmed.has(key) ? 'bg-green-900/30 border border-green-500' : 'bg-secondary-light'}`}
          onPress={() => handleConfirm(key)}
          disabled={confirmed.has(key)}
        >
          <Text className="text-2xl mr-4">{icon}</Text>
          <Text className="text-white flex-1 font-bold">{label}</Text>
          <Text className={confirmed.has(key) ? 'text-green-400' : 'text-primary'}>
            {confirmed.has(key) ? '✓ Confirmado' : 'Confirmar'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
