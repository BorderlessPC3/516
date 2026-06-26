import { FIRESTORE_COLLECTIONS } from '@herois/shared';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';

import { withFirestore } from '@/lib/firestore-guard';
import { db, isFirebaseConfigured } from './client';

export async function getCollectionCount(collectionName: string): Promise<number> {
  return withFirestore(async () => {
    const snap = await getDocs(query(collection(db, collectionName), limit(1000)));
    return snap.size;
  }, 0);
}

export async function listDocuments<T extends DocumentData>(
  collectionName: string,
  maxItems = 100,
  constraints: QueryConstraint[] = [],
): Promise<T[]> {
  return withFirestore(async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, collectionName),
          ...constraints,
          orderBy('createdAt', 'desc'),
          limit(maxItems),
        ),
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T);
    } catch {
      const snap = await getDocs(query(collection(db, collectionName), limit(maxItems)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T);
    }
  }, []);
}

export async function listDocumentsPaginated<T extends DocumentData>(
  collectionName: string,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    searchField?: string;
    filters?: Record<string, unknown>;
  } = {},
): Promise<{ data: T[]; total: number; hasMore: boolean }> {
  const pageSize = options.pageSize ?? 20;
  const constraints: QueryConstraint[] = [];

  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        constraints.push(where(key, '==', value));
      }
    });
  }

  return withFirestore(async () => {
    const snap = await getDocs(
      query(
        collection(db, collectionName),
        ...constraints,
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1),
      ),
    );

    let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T);

    if (options.search && options.searchField) {
      const term = options.search.toLowerCase();
      data = data.filter((item) => {
        const val = (item as Record<string, unknown>)[options.searchField!];
        return String(val ?? '').toLowerCase().includes(term);
      });
    }

    const hasMore = data.length > pageSize;
    if (hasMore) data = data.slice(0, pageSize);

    return { data, total: data.length, hasMore };
  }, { data: [], total: 0, hasMore: false });
}

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  return withFirestore(async () => {
    const snap = await getDoc(doc(db, collectionName, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as T;
  }, null);
}

export async function createDocument(
  collectionName: string,
  data: DocumentData,
  userId: string,
): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado. Salve quando o backend estiver disponível.');
  }

  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument(
  collectionName: string,
  id: string,
  data: Partial<DocumentData>,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.');
  }

  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.');
  }

  await deleteDoc(doc(db, collectionName, id));
}

export async function duplicateDocument(
  collectionName: string,
  id: string,
  userId: string,
  overrides: Partial<DocumentData> = {},
): Promise<string> {
  const original = await getDocument<DocumentData>(collectionName, id);
  if (!original) throw new Error('Documento não encontrado');
  const { id: _id, createdAt, updatedAt, ...rest } = original;
  return createDocument(collectionName, { ...rest, ...overrides, name: `${rest.name} (cópia)` }, userId);
}

export { FIRESTORE_COLLECTIONS };
