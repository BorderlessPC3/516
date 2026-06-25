import { VIDEO_PLAYBACK_SPEEDS } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

import { campaignRepository } from '@/data/repositories/campaign.repository';
import { videoPlayerService } from '@/services/video/video-player.service';

export default function VideoPlayerScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(2);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [initialPosition, setInitialPosition] = useState(0);
  const [completed, setCompleted] = useState(false);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignRepository.findById(campaignId!),
    enabled: !!campaignId,
  });

  useEffect(() => {
    if (!campaignId || !campaign?.videoId) return;
    videoPlayerService.getProgress(campaignId, campaign.videoId).then((p) => {
      if (p) setInitialPosition(p.currentTime);
    });
  }, [campaignId, campaign?.videoId]);

  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (!status.isLoaded || !campaign?.videoId) return;

    setIsPlaying(status.isPlaying);
    setProgress(status.positionMillis / 1000);
    setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);

    if (status.positionMillis && status.durationMillis) {
      const currentTime = status.positionMillis / 1000;
      const dur = status.durationMillis / 1000;
      await videoPlayerService.saveProgress(campaignId!, campaign.videoId, currentTime, dur);

      if (currentTime / dur >= 0.9 && !completed) {
        setCompleted(true);
        await videoPlayerService.markCompleted(campaignId!, campaign.videoId);
      }
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      if (initialPosition > 0) {
        await videoRef.current?.setPositionAsync(initialPosition * 1000);
        setInitialPosition(0);
      }
      await videoRef.current?.playAsync();
    }
  };

  const cycleSpeed = async () => {
    const nextIndex = (speedIndex + 1) % VIDEO_PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    await videoRef.current?.setRateAsync(VIDEO_PLAYBACK_SPEEDS[nextIndex], true);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  const videoUrl = campaign?.videoUrl || campaign?.cloudFrontUrl;

  return (
    <View className="flex-1 bg-black">
      {videoUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={{ flex: 1 }}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-white">Vídeo não disponível</Text>
        </View>
      )}

      <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-4">
        <Text className="text-white font-bold mb-2">{campaign?.name}</Text>
        <View className="h-1 bg-gray-700 rounded-full mb-4">
          <View
            className="h-1 bg-primary rounded-full"
            style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
          />
        </View>
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={togglePlay} className="bg-primary px-6 py-2 rounded-lg">
            <Text className="text-white font-bold">{isPlaying ? 'Pause' : 'Play'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={cycleSpeed}
            className="bg-secondary-light px-4 py-2 rounded-lg"
          >
            <Text className="text-white">{VIDEO_PLAYBACK_SPEEDS[speedIndex]}x</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} className="px-4 py-2">
            <Text className="text-white">Fechar</Text>
          </TouchableOpacity>
        </View>
        {completed && (
          <Text className="text-green-400 text-center mt-3">
            ✓ Campanha concluída! Moedas creditadas.
          </Text>
        )}
      </View>
    </View>
  );
}
