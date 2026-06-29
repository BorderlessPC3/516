import { FIRESTORE_COLLECTIONS, SETTINGS_KEYS, type CoinRewardCatalogItem } from '@herois/shared';
import { doc, getDoc } from 'firebase/firestore';

import { firestore } from '@/services/firebase/firebase-client';

export async function fetchCoinRewardsCatalog(): Promise<CoinRewardCatalogItem[]> {
  const snap = await getDoc(doc(firestore, FIRESTORE_COLLECTIONS.SETTINGS, SETTINGS_KEYS.COIN_REWARDS));
  if (!snap.exists()) return [];
  const value = snap.data()?.value as { rewards?: CoinRewardCatalogItem[] };
  return (value?.rewards ?? []).filter((r) => r.isActive);
}
