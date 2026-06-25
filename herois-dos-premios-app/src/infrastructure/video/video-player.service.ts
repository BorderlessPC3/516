import { FIRESTORE_COLLECTIONS, calculateWatchedPercent, isVideoCompleted } from '@herois/shared';
import type { VideoProgress } from '@herois/shared';
import type { IVideoPlayerService } from '@herois/shared';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { firestore, firebaseFunctions, firebaseAuth } from '@/services/firebase/firebase-client';

class VideoPlayerService implements IVideoPlayerService {
  async saveProgress(
    campaignId: string,
    videoId: string,
    currentTime: number,
    duration: number,
  ): Promise<void> {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;

    const watchedPercent = calculateWatchedPercent(currentTime, duration);
    const progressId = `${userId}_${campaignId}_${videoId}`;

    await setDoc(
      doc(firestore, FIRESTORE_COLLECTIONS.VIDEO_PROGRESS, progressId),
      {
        userId,
        campaignId,
        videoId,
        currentTimeSeconds: currentTime,
        durationSeconds: duration,
        watchedPercent,
        isCompleted: isVideoCompleted(watchedPercent),
        lastWatchedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async getProgress(
    campaignId: string,
    videoId: string,
  ): Promise<{ currentTime: number; watchedPercent: number } | null> {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return null;

    const progressId = `${userId}_${campaignId}_${videoId}`;
    const snap = await getDoc(doc(firestore, FIRESTORE_COLLECTIONS.VIDEO_PROGRESS, progressId));

    if (!snap.exists()) return null;

    const data = snap.data() as VideoProgress;
    return {
      currentTime: data.currentTimeSeconds,
      watchedPercent: data.watchedPercent,
    };
  }

  async markCompleted(campaignId: string, videoId: string): Promise<void> {
    const onVideoCompleted = httpsCallable(firebaseFunctions, 'onVideoCompleted');
    const progress = await this.getProgress(campaignId, videoId);

    await onVideoCompleted({
      campaignId,
      videoId,
      watchedSeconds: progress?.currentTime ?? 0,
      watchedPercent: progress?.watchedPercent ?? 1,
    });
  }
}

export const videoPlayerService = new VideoPlayerService();
