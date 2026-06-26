import { FIRESTORE_COLLECTIONS } from '@herois/shared';
import { HttpsError } from 'firebase-functions/v2/https';
import type { Firestore } from 'firebase-admin/firestore';

export async function assertAdmin(db: Firestore, uid: string): Promise<{ email: string; role: string }> {
  const adminDoc = await db.collection(FIRESTORE_COLLECTIONS.ADMINS).doc(uid).get();
  if (!adminDoc.exists || !adminDoc.data()?.isActive) {
    throw new HttpsError('permission-denied', 'Acesso negado');
  }
  const data = adminDoc.data()!;
  return { email: data.email as string, role: data.role as string };
}

export async function assertAuthenticated(uid: string | undefined): Promise<string> {
  if (!uid) throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  return uid;
}
