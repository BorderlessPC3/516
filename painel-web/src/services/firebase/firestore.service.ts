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
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';

import { db } from './client';

export async function getCollectionCount(collectionName: string): Promise<number> {
  const snap = await getDocs(query(collection(db, collectionName), limit(1000)));
  return snap.size;
}

export async function listDocuments<T extends DocumentData>(
  collectionName: string,
  maxItems = 100,
): Promise<T[]> {
  const snap = await getDocs(
    query(collection(db, collectionName), orderBy('createdAt', 'desc'), limit(maxItems)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T);
}

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

export async function createDocument(
  collectionName: string,
  data: DocumentData,
  userId: string,
): Promise<string> {
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
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

export { FIRESTORE_COLLECTIONS };
