import {
  FIRESTORE_COLLECTIONS,
  VIDEO_COMPLETION_THRESHOLD,
  VideoProcessingStatus,
  calculateWatchedPercent,
  isVideoCompleted,
  withRetry,
} from '@herois/shared';
import type { CampaignVideo, VideoProgress } from '@herois/shared';
import type { IVideoPlayerService } from '@herois/shared';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
  orderBy,
} from 'firebase/firestore';
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
  ): Promise<{ currentTime: number; watchedPercent: number; isCompleted: boolean } | null> {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return null;

    const progressId = `${userId}_${campaignId}_${videoId}`;
    const snap = await getDoc(doc(firestore, FIRESTORE_COLLECTIONS.VIDEO_PROGRESS, progressId));

    if (!snap.exists()) return null;

    const data = snap.data() as VideoProgress;
    return {
      currentTime: data.currentTimeSeconds,
      watchedPercent: data.watchedPercent,
      isCompleted: data.isCompleted,
    };
  }

  async markCompleted(
    campaignId: string,
    videoId: string,
    watchedSeconds: number,
    watchedPercent: number,
  ) {
    if (watchedPercent < VIDEO_COMPLETION_THRESHOLD) {
      return { coinsEarned: 0, campaignCompleted: false };
    }

    const onVideoCompleted = httpsCallable(firebaseFunctions, 'onVideoCompleted');
    const response = await withRetry(async () => {
      const result = await onVideoCompleted({
        campaignId,
        videoId,
        watchedSeconds,
        watchedPercent,
      });
      return result.data as {
        coinsEarned?: number;
        campaignCompleted?: boolean;
        couponId?: string;
        newBalance?: number;
      };
    });

    return response;
  }

  async getCampaignVideos(campaignId: string) {
    const snap = await getDocs(
      query(
        collection(firestore, FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS),
        where('campaignId', '==', campaignId),
        where('processingStatus', '==', VideoProcessingStatus.READY),
        orderBy('sequenceOrder', 'asc'),
      ),
    );

    return snap.docs.map((d) => {
      const data = d.data() as CampaignVideo;
      return {
        id: d.id,
        title: data.title,
        url: data.cloudFrontUrl || data.processedUrl || data.originalUrl || '',
        sequenceOrder: data.sequenceOrder ?? 0,
        durationSeconds: data.durationSeconds,
      };
    });
  }

  async trackAnalytics(event: string, metadata?: Record<string, unknown>) {
    const trackVideoAnalytics = httpsCallable(firebaseFunctions, 'trackVideoAnalytics');
    await trackVideoAnalytics({ event, ...metadata }).catch(() => {
      // offline — ignora silenciosamente
    });
  }
}

export const videoPlayerService = new VideoPlayerService();
