import { VIDEO_PLAYBACK_SPEEDS, VIDEO_COMPLETION_THRESHOLD } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';

import { campaignRepository } from '@/data/repositories/campaign.repository';
import {
  getCampaignParticipation,
  getCampaignSponsorSteps,
  type SponsorStep,
} from '@/data/repositories/sponsor.repository';
import { useNetworkStatus } from '@/hooks/use-network';
import { videoPlayerService } from '@/services/video/video-player.service';
import { firebaseAuth } from '@/services/firebase/firebase-client';

const PROGRESS_SAVE_INTERVAL_MS = 3000;

export default function VideoPlayerScreen() {
  const { campaignId, startStep } = useLocalSearchParams<{ campaignId: string; startStep?: string }>();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const videoRef = useRef<Video>(null);
  const lastSaveRef = useRef(0);
  const maxWatchedRef = useRef(0);

  const [stepIndex, setStepIndex] = useState(Number(startStep) || 0);
  const [speedIndex, setSpeedIndex] = useState(2);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtitleText, setSubtitleText] = useState<string | null>(null);

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignRepository.findById(campaignId!),
    enabled: !!campaignId,
  });

  const { data: steps = [], isLoading: stepsLoading } = useQuery({
    queryKey: ['sponsor-steps', campaignId],
    queryFn: () => getCampaignSponsorSteps(campaignId!),
    enabled: !!campaignId,
  });

  const uid = firebaseAuth.currentUser?.uid;

  useEffect(() => {
    if (!uid || !campaignId || startStep) return;
    getCampaignParticipation(uid, campaignId).then((p) => {
      if (p?.currentStepIndex != null && p.currentStepIndex > 0) {
        setStepIndex(p.currentStepIndex);
      }
    });
  }, [uid, campaignId, startStep]);

  const currentStep: SponsorStep | undefined = steps[stepIndex];
  const videoId = currentStep?.videoId ?? currentStep?.sponsorId ?? `step-${stepIndex}`;
  const videoUrl = currentStep?.videoUrl || campaign?.videoUrl;
  const isLoading = campaignLoading || stepsLoading;

  const loadProgress = useCallback(async () => {
    if (!campaignId || !videoId) return;
    const p = await videoPlayerService.getProgress(campaignId, videoId);
    if (p && !p.isCompleted) {
      maxWatchedRef.current = p.currentTime;
      await videoRef.current?.setPositionAsync(p.currentTime * 1000);
    }
  }, [campaignId, videoId]);

  useEffect(() => {
    loadProgress();
    maxWatchedRef.current = 0;
    videoPlayerService.trackAnalytics('VIDEO_STARTED', {
      campaignId,
      videoId,
      sponsorId: currentStep?.sponsorId,
    });
  }, [loadProgress, campaignId, videoId, currentStep?.sponsorId]);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.playAsync().catch(() => setError('Erro ao iniciar reprodução'));
    }
  }, [videoUrl, stepIndex]);

  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (!status.isLoaded || !campaignId || !videoId) return;

    setBuffering(status.isBuffering);
    setProgress(status.positionMillis / 1000);
    setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);

    const currentTime = status.positionMillis / 1000;
    const dur = status.durationMillis ? status.durationMillis / 1000 : 0;

    if (currentTime > maxWatchedRef.current + 2) {
      await videoRef.current?.setPositionAsync(maxWatchedRef.current * 1000);
      return;
    }
    if (currentTime > maxWatchedRef.current) maxWatchedRef.current = currentTime;

    const now = Date.now();
    if (now - lastSaveRef.current > PROGRESS_SAVE_INTERVAL_MS) {
      lastSaveRef.current = now;
      await videoPlayerService.saveProgress(campaignId, videoId, currentTime, dur);
    }

    const watchedPercent = dur > 0 ? currentTime / dur : 0;

    if (watchedPercent >= VIDEO_COMPLETION_THRESHOLD && status.isPlaying === false && dur > 0 && currentTime >= dur * VIDEO_COMPLETION_THRESHOLD) {
      // handled on didJustFinish below
    }
  };

  const handleVideoComplete = async () => {
    if (!campaignId || !videoId || !isOnline) return;

    const dur = duration || 1;
    const result = await videoPlayerService.markCompleted(
      campaignId,
      videoId,
      dur,
      1,
      currentStep?.sponsorId,
    );

    if (result.campaignCompleted) {
      router.replace(`/(app)/social/${campaignId}?completed=true&couponId=${result.couponId ?? ''}`);
      return;
    }

    router.replace({
      pathname: '/(app)/sponsor-step/[campaignId]',
      params: {
        campaignId,
        sponsorId: currentStep?.sponsorId ?? '',
        stepIndex: String(stepIndex),
        totalSteps: String(steps.length || 1),
      },
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#e94560" />
        <Text className="text-white mt-4">Carregando vídeos...</Text>
      </View>
    );
  }

  if (!videoUrl) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-center">Nenhum vídeo disponível para esta etapa</Text>
        <TouchableOpacity className="mt-6 bg-primary px-6 py-3 rounded-lg" onPress={() => router.back()}>
          <Text className="text-white font-bold">Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const watchedPercent = duration > 0 ? Math.round((progress / duration) * 100) : 0;

  return (
    <View className="flex-1 bg-black">
      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-400 text-center mb-4">{error}</Text>
          <TouchableOpacity className="bg-primary px-6 py-3 rounded-lg" onPress={() => { setError(null); videoRef.current?.playAsync(); }}>
            <Text className="text-white font-bold">Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={{ flex: 1 }}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          shouldPlay
          rate={VIDEO_PLAYBACK_SPEEDS[speedIndex]}
          onPlaybackStatusUpdate={(status) => {
            handlePlaybackStatusUpdate(status);
            if (status.isLoaded && status.didJustFinish) {
              handleVideoComplete();
            }
          }}
          onError={() => setError('Erro ao carregar o vídeo. Verifique sua conexão.')}
        />
      )}

      {subtitleText && (
        <View className="absolute bottom-32 left-4 right-4 bg-black/70 p-2 rounded">
          <Text className="text-white text-center">{subtitleText}</Text>
        </View>
      )}

      {buffering && (
        <View className="absolute top-1/2 left-0 right-0 items-center">
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      )}

      <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-4">
        <Text className="text-white font-bold mb-1">{currentStep?.sponsorName ?? campaign?.name}</Text>
        {steps.length > 1 && (
          <Text className="text-gray-400 text-sm mb-2">
            Etapa {stepIndex + 1} de {steps.length}
          </Text>
        )}
        <View className="h-1 bg-gray-700 rounded-full mb-2">
          <View className="h-1 bg-primary rounded-full" style={{ width: `${watchedPercent}%` }} />
        </View>
        <Text className="text-gray-400 text-xs mb-3">
          {watchedPercent}% assistido • {Math.floor(progress)}s / {Math.floor(duration)}s
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {VIDEO_PLAYBACK_SPEEDS.map((speed, i) => (
            <TouchableOpacity
              key={speed}
              className={`mr-2 px-3 py-1 rounded ${speedIndex === i ? 'bg-primary' : 'bg-gray-700'}`}
              onPress={() => setSpeedIndex(i)}
            >
              <Text className="text-white text-xs">{speed}x</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={() => router.back()} className="px-4 py-2 self-end">
          <Text className="text-white">Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
