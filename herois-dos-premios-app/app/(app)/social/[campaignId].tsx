import { FIRESTORE_COLLECTIONS, SocialNetwork } from '@herois/shared';
import { useLocalSearchParams } from 'expo-router';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

import { firestore, firebaseAuth } from '@/services/firebase/firebase-client';

const NETWORKS = [
  { key: SocialNetwork.INSTAGRAM, label: 'Instagram', icon: '📸' },
  { key: SocialNetwork.FACEBOOK, label: 'Facebook', icon: '👤' },
  { key: SocialNetwork.TIKTOK, label: 'TikTok', icon: '🎵' },
  { key: SocialNetwork.WHATSAPP, label: 'WhatsApp', icon: '💬' },
];

export default function SocialActionsScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

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

  return (
    <View className="flex-1 bg-secondary pt-16 px-4">
      <Text className="text-2xl font-bold text-white mb-2">Redes Sociais</Text>
      <Text className="text-gray-400 mb-8">
        Confirme que você seguiu/compartilhou nas redes exigidas
      </Text>

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
