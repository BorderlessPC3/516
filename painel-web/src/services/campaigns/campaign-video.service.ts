import {
  FIRESTORE_COLLECTIONS,
  VideoProcessingStatus,
  type CampaignVideo,
} from '@herois/shared';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

import { auth, db, storage } from '@/services/firebase/client';
import { createDocument, updateDocument } from '@/services/firebase/firestore.service';

export function resolveVideoPlaybackUrl(video: CampaignVideo): string | undefined {
  return video.cloudFrontUrl || video.processedUrl || video.originalUrl;
}

export async function uploadCampaignVideo(
  campaignId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado');

  const videoId = await createDocument(
    FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS,
    {
      title: file.name,
      originalFileName: file.name,
      campaignId,
      processingStatus: VideoProcessingStatus.UPLOADING,
      scope: 'NATIONAL',
      fileSizeBytes: file.size,
      sequenceOrder: 0,
    },
    uid,
  );

  const storageRef = ref(storage, `videos/temp/${videoId}/${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        onProgress?.((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      },
      reject,
      resolve,
    );
  });

  const originalUrl = await getDownloadURL(storageRef);

  await updateDocument(FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS, videoId, {
    originalUrl,
    processingStatus: VideoProcessingStatus.PENDING_UPLOAD,
  });

  await linkVideoToCampaign(campaignId, videoId, originalUrl);
  return videoId;
}

export async function linkVideoToCampaign(
  campaignId: string,
  videoId: string,
  playbackUrl?: string,
): Promise<void> {
  if (!playbackUrl) {
    const videoSnap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS, videoId));
    if (videoSnap.exists()) {
      playbackUrl = resolveVideoPlaybackUrl(videoSnap.data() as CampaignVideo);
    }
  }

  await updateDocument(FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS, videoId, {
    campaignId,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.CAMPAIGNS, campaignId), {
    videoId,
    ...(playbackUrl ? { videoUrl: playbackUrl } : {}),
    videoIds: arrayUnion(videoId),
    updatedAt: serverTimestamp(),
  });
}
