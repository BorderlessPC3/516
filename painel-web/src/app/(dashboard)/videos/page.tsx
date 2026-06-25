'use client';

import { FIRESTORE_COLLECTIONS, VideoProcessingStatus } from '@herois/shared';
import type { CampaignVideo } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, storage } from '@/services/firebase/client';
import { listDocuments, createDocument } from '@/services/firebase/firestore.service';

const STATUS_COLORS: Record<string, string> = {
  READY: 'text-green-400',
  FAILED: 'text-red-400',
  PENDING_UPLOAD: 'text-yellow-400',
  COMPRESSING: 'text-blue-400',
  TRANSCRIBING: 'text-blue-400',
  UPLOADING_S3: 'text-blue-400',
};

export default function VideosPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: videos = [], refetch } = useQuery({
    queryKey: ['videos'],
    queryFn: () => listDocuments<CampaignVideo>(FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setUploading(true);
    try {
      const videoId = await createDocument(
        FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS,
        {
          title: file.name,
          originalFileName: file.name,
          processingStatus: VideoProcessingStatus.UPLOADING,
          scope: 'NATIONAL',
          fileSizeBytes: file.size,
        },
        uid,
      );

      const storageRef = ref(storage, `videos/temp/${videoId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', (snapshot) => {
        setProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed', null, reject, resolve);
      });

      const originalUrl = await getDownloadURL(storageRef);

      const { updateDocument } = await import('@/services/firebase/firestore.service');
      await updateDocument(FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS, videoId, {
        originalUrl,
        processingStatus: VideoProcessingStatus.PENDING_UPLOAD,
      });

      refetch();
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gestão de Vídeos</h1>
        <label>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button asChild disabled={uploading}>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? `Enviando ${progress.toFixed(0)}%` : 'Upload Vídeo'}
            </span>
          </Button>
        </label>
      </div>

      <p className="text-muted-foreground mb-6 text-sm">
        Após upload: compressão → legendas automáticas → S3 → CloudFront
      </p>

      <div className="grid gap-4">
        {videos.map((video) => (
          <Card key={video.id}>
            <CardHeader>
              <CardTitle className="text-lg">{video.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`font-medium ${STATUS_COLORS[video.processingStatus] || ''}`}>
                Status: {video.processingStatus}
              </p>
              {video.cloudFrontUrl && (
                <a
                  href={video.cloudFrontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline"
                >
                  Ver no CloudFront →
                </a>
              )}
              {video.processingError && (
                <p className="text-destructive text-sm mt-2">{video.processingError}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {videos.length === 0 && <p className="text-muted-foreground">Nenhum vídeo enviado</p>}
      </div>
    </div>
  );
}
