import { AuditAction, FIRESTORE_COLLECTIONS } from '@herois/shared';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export async function writeAuditLog(
  db: Firestore,
  params: {
    adminId: string;
    adminEmail: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    changes?: Record<string, unknown>;
  },
): Promise<void> {
  await db.collection(FIRESTORE_COLLECTIONS.AUDIT_LOGS).add({
    ...params,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
