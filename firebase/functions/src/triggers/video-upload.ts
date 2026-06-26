import * as os from 'os';
import * as path from 'path';

import { FIRESTORE_COLLECTIONS, VideoProcessingStatus } from '@herois/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

import { isAwsConfigured } from '../config/aws';
import { storage } from '../config/firebase';
import { uploadToS3, uploadBufferToS3, generateS3Key } from '../services/aws-s3.service';
import {
  compressVideo,
  generateSubtitles,
  cleanupTempFiles,
} from '../services/video-processing.service';

export const onVideoUploadComplete = onDocumentUpdated(
  `${FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS}/{videoId}`,
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const videoId = event.params.videoId;

    if (!before || !after) return;
    if (
      before.processingStatus === after.processingStatus ||
      after.processingStatus !== VideoProcessingStatus.PENDING_UPLOAD
    ) {
      return;
    }

    const videoRef = event.data!.after.ref;

    if (!isAwsConfigured()) {
      await videoRef.update({
        processingStatus: VideoProcessingStatus.READY,
        processedUrl: after.originalUrl,
        cloudFrontUrl: after.originalUrl,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    let tempInputPath = '';
    let tempCompressedPath = '';
    let tempVttPath = '';

    try {
      await videoRef.update({
        processingStatus: VideoProcessingStatus.COMPRESSING,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const originalUrl = after.originalUrl as string;
      if (!originalUrl) throw new Error('URL original não encontrada');

      const bucket = storage.bucket();
      const storagePath = `videos/temp/${videoId}/${after.originalFileName}`;
      tempInputPath = path.join(os.tmpdir(), `input-${videoId}-${Date.now()}`);
      await bucket.file(storagePath).download({ destination: tempInputPath });

      const compressed = await compressVideo(tempInputPath);
      tempCompressedPath = compressed.outputPath;

      await videoRef.update({
        processingStatus: VideoProcessingStatus.TRANSCRIBING,
        durationSeconds: compressed.durationSeconds,
        fileSizeBytes: compressed.fileSizeBytes,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const { vttContent, vttPath } = await generateSubtitles(tempCompressedPath);
      tempVttPath = vttPath;

      await videoRef.update({
        processingStatus: VideoProcessingStatus.UPLOADING_S3,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const videoKey = generateS3Key(videoId, 'video.mp4');
      const vttKey = generateS3Key(videoId, 'subtitles.vtt');

      const cloudFrontVideoUrl = await uploadToS3(tempCompressedPath, videoKey, 'video/mp4');
      const cloudFrontVttUrl = await uploadBufferToS3(
        Buffer.from(vttContent, 'utf-8'),
        vttKey,
        'text/vtt',
      );

      await videoRef.update({
        processingStatus: VideoProcessingStatus.READY,
        processedUrl: cloudFrontVideoUrl,
        cloudFrontUrl: cloudFrontVideoUrl,
        s3Key: videoKey,
        subtitlesUrl: cloudFrontVttUrl,
        subtitlesVtt: vttContent,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      await videoRef.update({
        processingStatus: VideoProcessingStatus.FAILED,
        processingError: message,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } finally {
      cleanupTempFiles(tempInputPath, tempCompressedPath, tempVttPath);
    }
  },
);
