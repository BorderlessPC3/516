import { FIRESTORE_COLLECTIONS, CampaignStatus } from '@herois/shared';
import type { Campaign, PaginatedResult } from '@herois/shared';
import type { ICampaignRepository } from '@herois/shared';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

import { firestore } from '@/services/firebase/firebase-client';

class CampaignRepository implements ICampaignRepository {
  async findById(id: string): Promise<Campaign | null> {
    const snap = await getDoc(doc(firestore, FIRESTORE_COLLECTIONS.CAMPAIGNS, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Campaign;
  }

  async findActive(filters?: { cityId?: string }): Promise<Campaign[]> {
    let q = query(
      collection(firestore, FIRESTORE_COLLECTIONS.CAMPAIGNS),
      where('status', '==', CampaignStatus.ACTIVE),
      orderBy('startDate', 'desc'),
      limit(50),
    );

    if (filters?.cityId) {
      q = query(
        collection(firestore, FIRESTORE_COLLECTIONS.CAMPAIGNS),
        where('status', '==', CampaignStatus.ACTIVE),
        where('cityId', '==', filters.cityId),
        orderBy('startDate', 'desc'),
        limit(50),
      );
    }

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Campaign);
  }

  async list(filters: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<PaginatedResult<Campaign>> {
    const pageSize = filters.pageSize ?? 20;
    const page = filters.page ?? 1;

    let q = query(
      collection(firestore, FIRESTORE_COLLECTIONS.CAMPAIGNS),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    );

    if (filters.status) {
      q = query(
        collection(firestore, FIRESTORE_COLLECTIONS.CAMPAIGNS),
        where('status', '==', filters.status),
        orderBy('createdAt', 'desc'),
        limit(pageSize),
      );
    }

    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Campaign);

    return {
      data,
      total: data.length,
      page,
      pageSize,
      hasMore: data.length === pageSize,
    };
  }

  async create(_data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    throw new Error('Create campaign only available in admin panel');
  }

  async update(_id: string, _data: Partial<Campaign>): Promise<Campaign> {
    throw new Error('Update campaign only available in admin panel');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Delete campaign only available in admin panel');
  }
}

export const campaignRepository = new CampaignRepository();
