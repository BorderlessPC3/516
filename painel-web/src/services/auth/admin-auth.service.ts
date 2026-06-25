import { AdminRole, FIRESTORE_COLLECTIONS, ROLE_PERMISSIONS, Permission } from '@herois/shared';
import type { Admin } from '@herois/shared';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../firebase/client';

class AdminAuthService {
  private currentAdmin: Admin | null = null;
  private permissions: Permission[] = [];

  async signIn(email: string, password: string): Promise<{ uid: string; token: string }> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const adminDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.ADMINS, credential.user.uid));

    if (!adminDoc.exists() || !adminDoc.data()?.isActive) {
      await signOut(auth);
      throw new Error('Acesso não autorizado');
    }

    this.currentAdmin = { id: adminDoc.id, ...adminDoc.data() } as Admin;
    this.permissions = ROLE_PERMISSIONS[this.currentAdmin.role as AdminRole] || [];
    const token = await credential.user.getIdToken();

    return { uid: credential.user.uid, token };
  }

  async signOut(): Promise<void> {
    this.currentAdmin = null;
    this.permissions = [];
    await signOut(auth);
  }

  async getCurrentAdmin(): Promise<Admin | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const adminDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.ADMINS, user.uid));
    if (!adminDoc.exists()) return null;

    this.currentAdmin = { id: adminDoc.id, ...adminDoc.data() } as Admin;
    this.permissions = ROLE_PERMISSIONS[this.currentAdmin.role as AdminRole] || [];
    return this.currentAdmin;
  }

  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  getPermissions(): Permission[] {
    return this.permissions;
  }
}

export const adminAuthService = new AdminAuthService();
