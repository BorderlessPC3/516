import { VIDEO_PLAYBACK_SPEEDS, VIDEO_COMPLETION_THRESHOLD } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

import { campaignRepository } from '@/data/repositories/campaign.repository';
import { useNetworkStatus } from '@/hooks/use-network';
import { videoPlayerService } from '@/services/video/video-player.service';

const PROGRESS_SAVE_INTERVAL_MS = 3000;
const ABANDON_TIMEOUT_MS = 30000;

export default function VideoPlayerScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const videoRef = useRef<Video>(null);
  const lastSaveRef = useRef(0);
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWatchedRef = useRef(0);

  const [videoIndex, setVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex] = useState(2);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());
  const [campaignDone, setCampaignDone] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignRepository.findById(campaignId!),
    enabled: !!campaignId,
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['campaign-videos', campaignId],
    queryFn: () => videoPlayerService.getCampaignVideos(campaignId!),
    enabled: !!campaignId,
  });

  const currentVideo = videos[videoIndex];
  const isLoading = campaignLoading || videosLoading;

  const loadProgress = useCallback(async () => {
    if (!campaignId || !currentVideo) return;
    const p = await videoPlayerService.getProgress(campaignId, currentVideo.id);
    if (p?.isCompleted) {
      setCompletedVideos((prev) => new Set([...prev, currentVideo.id]));
    }
    if (p && !p.isCompleted) {
      maxWatchedRef.current = p.currentTime;
      await videoRef.current?.setPositionAsync(p.currentTime * 1000);
    }
  }, [campaignId, currentVideo]);

  useEffect(() => {
    loadProgress();
    videoPlayerService.trackAnalytics('VIDEO_STARTED', { campaignId, videoId: currentVideo?.id });
  }, [loadProgress, campaignId, currentVideo?.id]);

  useEffect(() => {
    if (currentVideo && videoRef.current) {
      videoRef.current.playAsync().catch(() => setError('Erro ao iniciar reprodução'));
    }
  }, [currentVideo]);

  const resetAbandonTimer = () => {
    if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
    abandonTimerRef.current = setTimeout(() => {
      videoPlayerService.trackAnalytics('VIDEO_ABANDONED', {
        campaignId,
        videoId: currentVideo?.id,
        progress,
        duration,
      });
    }, ABANDON_TIMEOUT_MS);
  };

  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (!status.isLoaded || !currentVideo || !campaignId) return;

    setIsPlaying(status.isPlaying);
    setBuffering(status.isBuffering);
    setProgress(status.positionMillis / 1000);
    setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);

    if (status.isPlaying) resetAbandonTimer();

    const currentTime = status.positionMillis / 1000;
    const dur = status.durationMillis ? status.durationMillis / 1000 : 0;

    if (currentTime > maxWatchedRef.current + 2) {
      await videoRef.current?.setPositionAsync(maxWatchedRef.current * 1000);
      return;
    }

    if (currentTime > maxWatchedRef.current) {
      maxWatchedRef.current = currentTime;
    }

    const now = Date.now();
    if (now - lastSaveRef.current > PROGRESS_SAVE_INTERVAL_MS) {
      lastSaveRef.current = now;
      await videoPlayerService.saveProgress(campaignId, currentVideo.id, currentTime, dur);
    }

    const watchedPercent = dur > 0 ? currentTime / dur : 0;

    if (watchedPercent >= VIDEO_COMPLETION_THRESHOLD && !completedVideos.has(currentVideo.id)) {
      const newCompleted = new Set([...completedVideos, currentVideo.id]);
      setCompletedVideos(newCompleted);

      if (isOnline) {
        const result = await videoPlayerService.markCompleted(
          campaignId,
          currentVideo.id,
          currentTime,
          watchedPercent,
        );

        if (result.campaignCompleted) {
          setCampaignDone(true);
          setCoinsEarned(result.coinsEarned ?? 0);
          videoPlayerService.trackAnalytics('CAMPAIGN_COMPLETED', { campaignId });
          router.replace(`/(app)/social/${campaignId}?completed=true&couponId=${result.couponId ?? ''}`);
          return;
        }
      }

      if (videoIndex < videos.length - 1) {
        setVideoIndex(videoIndex + 1);
        maxWatchedRef.current = 0;
        videoPlayerService.trackAnalytics('VIDEO_COMPLETED', { campaignId, videoId: currentVideo.id });
      }
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#e94560" />
        <Text className="text-white mt-4">Carregando vídeos...</Text>
      </View>
    );
  }

  if (!videos.length) {
    const fallbackUrl = campaign?.videoUrl;
    if (!fallbackUrl) {
      return (
        <View className="flex-1 bg-black items-center justify-center px-6">
          <Text className="text-white text-center">Nenhum vídeo disponível para esta campanha</Text>
          <TouchableOpacity className="mt-6 bg-primary px-6 py-3 rounded-lg" onPress={() => router.back()}>
            <Text className="text-white font-bold">Voltar</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  const videoUrl = currentVideo?.url || campaign?.videoUrl;
  const watchedPercent = duration > 0 ? Math.round((progress / duration) * 100) : 0;

  return (
    <View className="flex-1 bg-black">
      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-400 text-center mb-4">{error}</Text>
          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-lg"
            onPress={() => { setError(null); videoRef.current?.playAsync(); }}
          >
            <Text className="text-white font-bold">Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : videoUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={{ flex: 1 }}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          shouldPlay
          rate={VIDEO_PLAYBACK_SPEEDS[speedIndex]}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={() => setError('Erro ao carregar o vídeo. Verifique sua conexão.')}
        />
      ) : null}

      {buffering && (
        <View className="absolute top-1/2 left-0 right-0 items-center">
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      )}

      <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-4">
        <Text className="text-white font-bold mb-1">{campaign?.name}</Text>
        {videos.length > 1 && (
          <Text className="text-gray-400 text-sm mb-2">
            Vídeo {videoIndex + 1} de {videos.length}: {currentVideo?.title}
          </Text>
        )}
        <View className="h-1 bg-gray-700 rounded-full mb-2">
          <View
            className="h-1 bg-primary rounded-full"
            style={{ width: `${watchedPercent}%` }}
          />
        </View>
        <Text className="text-gray-400 text-xs mb-3">
          {watchedPercent}% assistido • {Math.floor(progress)}s / {Math.floor(duration)}s
        </Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-500 text-sm">Não é possível pular o vídeo</Text>
          {!campaignDone && (
            <TouchableOpacity onPress={() => router.back()} className="px-4 py-2">
              <Text className="text-white">Sair</Text>
            </TouchableOpacity>
          )}
        </View>
        {campaignDone && (
          <Text className="text-green-400 text-center mt-3">
            ✓ Campanha concluída! +{coinsEarned} moedas
          </Text>
        )}
      </View>
    </View>
  );
}
