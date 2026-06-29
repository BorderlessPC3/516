import type { Banner } from '@herois/shared';
import { BannerScope, FIRESTORE_COLLECTIONS } from '@herois/shared';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

import { firestore } from '@/services/firebase/firebase-client';

export async function fetchActiveBanners(user?: {
  cityId?: string;
  state?: string;
}): Promise<Banner[]> {
  const snap = await getDocs(
    query(
      collection(firestore, FIRESTORE_COLLECTIONS.BANNERS),
      where('isActive', '==', true),
      orderBy('sequenceOrder', 'asc'),
    ),
  );

  const banners = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Banner);

  return banners.filter((b) => {
    if (b.scope === BannerScope.NATIONAL) return true;
    if (b.scope === BannerScope.REGIONAL && user?.state && b.state === user.state) return true;
    if (b.scope === BannerScope.MUNICIPAL && user?.cityId && b.cityId === user.cityId) return true;
    if (b.scope === BannerScope.SPONSOR) return true;
    return false;
  });
}
