'use client';

import {
  FIRESTORE_COLLECTIONS,
  VideoProcessingStatus,
  type Campaign,
  type CampaignVideo,
} from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  linkVideoToCampaign,
  resolveVideoPlaybackUrl,
  uploadCampaignVideo,
} from '@/services/campaigns/campaign-video.service';
import { listDocuments } from '@/services/firebase/firestore.service';

interface CampaignVideoSectionProps {
  campaignId: string;
  campaign?: Campaign | null;
  onLinked?: () => void;
}

export function CampaignVideoSection({
  campaignId,
  campaign,
  onLinked,
}: CampaignVideoSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedVideoId, setSelectedVideoId] = useState(campaign?.videoId ?? '');

  const { data: videos = [], refetch } = useQuery({
    queryKey: ['campaign-videos', campaignId],
    queryFn: () =>
      listDocuments<CampaignVideo>(FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS, 200),
  });

  const readyVideos = videos.filter(
    (v) =>
      v.processingStatus === VideoProcessingStatus.READY ||
      v.processingStatus === VideoProcessingStatus.PENDING_UPLOAD ||
      !!v.originalUrl,
  );

  const linkedVideo = videos.find((v) => v.id === campaign?.videoId);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const videoId = await uploadCampaignVideo(campaignId, file, setProgress);
      setSelectedVideoId(videoId);
      await refetch();
      onLinked?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha no upload do vídeo');
    } finally {
      setUploading(false);
      setProgress(0);
      e.target.value = '';
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedVideoId) return;
    try {
      await linkVideoToCampaign(campaignId, selectedVideoId);
      await refetch();
      onLinked?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível vincular o vídeo');
    }
  };

  const playbackUrl = linkedVideo ? resolveVideoPlaybackUrl(linkedVideo) : campaign?.videoUrl;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Vídeo da promoção</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Envie o vídeo desta campanha. Ao escanear o QR Code, o usuário assistirá a este vídeo no
          app (se instalado) ou no navegador.
        </p>

        {playbackUrl ? (
          <video
            src={playbackUrl}
            controls
            className="w-full max-h-56 rounded-lg bg-black"
            poster={campaign?.bannerUrl}
          />
        ) : (
          <p className="text-sm text-yellow-600">Nenhum vídeo vinculado ainda.</p>
        )}

        {linkedVideo && (
          <p className="text-xs text-muted-foreground">
            Status: {linkedVideo.processingStatus}
            {linkedVideo.processingStatus !== VideoProcessingStatus.READY &&
              ' — o vídeo ficará disponível após o processamento.'}
          </p>
        )}

        <label>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button type="button" asChild disabled={uploading}>
            <span>
              <Upload className="h-4 w-4 mr-2 inline" />
              {uploading ? `Enviando ${progress.toFixed(0)}%` : 'Enviar vídeo desta campanha'}
            </span>
          </Button>
        </label>

        {readyVideos.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <label className="text-sm font-medium">Ou vincular vídeo existente</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedVideoId}
              onChange={(e) => setSelectedVideoId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {readyVideos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title} ({video.processingStatus})
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={!selectedVideoId}
              onClick={handleLinkExisting}
            >
              Vincular vídeo selecionado
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
