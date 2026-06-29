import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

import { getCampaignSponsorSteps } from '@/data/repositories/sponsor.repository';
import { FIRESTORE_COLLECTIONS, SocialNetwork } from '@herois/shared';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore, firebaseAuth } from '@/services/firebase/firebase-client';
import { useQuery } from '@tanstack/react-query';

const NETWORK_LABELS: Record<string, string> = {
  [SocialNetwork.INSTAGRAM]: 'Instagram',
  [SocialNetwork.FACEBOOK]: 'Facebook',
  [SocialNetwork.TIKTOK]: 'TikTok',
  [SocialNetwork.WHATSAPP]: 'WhatsApp',
};

export default function SponsorStepScreen() {
  const router = useRouter();
  const { campaignId, sponsorId, stepIndex, totalSteps } = useLocalSearchParams<{
    campaignId: string;
    sponsorId: string;
    stepIndex: string;
    totalSteps: string;
  }>();
  const [confirmed, setConfirmed] = useState(false);

  const { data: steps = [] } = useQuery({
    queryKey: ['sponsor-steps', campaignId],
    queryFn: () => getCampaignSponsorSteps(campaignId!),
    enabled: !!campaignId,
  });

  const step = steps.find((s) => s.sponsorId === sponsorId) ?? steps[Number(stepIndex)];
  const currentIndex = Number(stepIndex);
  const total = Number(totalSteps) || steps.length;
  const isLast = currentIndex >= total - 1;

  const handleOpenSocial = async (network: string, url: string) => {
    if (!url) {
      Alert.alert('Link indisponível', `Configure o link de ${NETWORK_LABELS[network] ?? network} no painel.`);
      return;
    }
    await Linking.openURL(url);
  };

  const handleConfirm = async () => {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid || !campaignId || !sponsorId) return;

    const actionId = `${uid}_${campaignId}_${sponsorId}`;
    await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.SOCIAL_ACTIONS, actionId), {
      userId: uid,
      campaignId,
      sponsorId,
      network: SocialNetwork.INSTAGRAM,
      confirmed: true,
      confirmedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setConfirmed(true);

    if (isLast) {
      router.replace(`/(app)/social/${campaignId}?completed=true`);
    } else {
      router.replace({
        pathname: '/(app)/video/[campaignId]',
        params: { campaignId, startStep: String(currentIndex + 1) },
      });
    }
  };

  if (!step) {
    return (
      <View className="flex-1 bg-secondary items-center justify-center">
        <Text className="text-white">Carregando patrocinador...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-secondary pt-16 px-4">
      <Text className="text-primary text-sm mb-2">
        Patrocinador {currentIndex + 1} de {total}
      </Text>
      <Text className="text-3xl font-bold text-white mb-2">{step.sponsorName}</Text>

      {step.prizeName && (
        <View className="bg-accent rounded-xl p-6 mb-6 items-center">
          <Text className="text-5xl mb-2">🎁</Text>
          <Text className="text-gold font-bold text-xl">{step.prizeName}</Text>
          <Text className="text-gray-400 mt-2">Prêmio do patrocinador</Text>
        </View>
      )}

      <Text className="text-white font-bold mb-4">Siga o patrocinador nas redes:</Text>

      {Object.entries(step.socialLinks ?? {}).map(([network, url]) => {
        if (!url) return null;
        return (
          <TouchableOpacity
            key={network}
            className="bg-secondary-light p-4 rounded-xl mb-3"
            onPress={() => handleOpenSocial(network, url)}
          >
            <Text className="text-white font-bold">{NETWORK_LABELS[network] ?? network}</Text>
            <Text className="text-primary text-sm mt-1">Abrir perfil →</Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        className={`py-4 rounded-lg mt-6 ${confirmed ? 'bg-green-900/40' : 'bg-primary'}`}
        onPress={handleConfirm}
        disabled={confirmed}
      >
        <Text className="text-white text-center font-bold text-lg">
          {confirmed ? '✓ Confirmado' : isLast ? 'Concluir Campanha' : 'Próximo Vídeo →'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="mt-4 py-3" onPress={() => router.back()}>
        <Text className="text-gray-500 text-center">Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}
