'use client';

import type { Admin } from '@herois/shared';
import { AdminRole, Permission } from '@herois/shared';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  clearDevAuthSession,
  hasDevAuthSession,
  isDevAuthEnabled,
  setDevAuthSession,
} from '@/lib/dev-auth';
import { adminAuthService } from '@/services/auth/admin-auth.service';
import { auth, isFirebaseConfigured } from '@/services/firebase/client';

const DEV_MOCK_ADMIN: Admin = {
  id: 'dev',
  email: 'dev@localhost',
  name: 'Administrador (dev)',
  role: AdminRole.SUPER_ADMIN,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface AuthContextValue {
  user: User | null;
  admin: Admin | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  signInDev: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [devSession, setDevSession] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDevAuthEnabled() && hasDevAuthSession()) {
      setDevSession(true);
      setAdmin(DEV_MOCK_ADMIN);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const adminData = await adminAuthService.getCurrentAdmin();
        setAdmin(adminData);
      } else {
        setAdmin(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInDev = () => {
    setDevAuthSession();
    setDevSession(true);
    setAdmin(DEV_MOCK_ADMIN);
  };

  const signOut = async () => {
    if (devSession) {
      clearDevAuthSession();
      setDevSession(false);
      setAdmin(null);
      return;
    }
    await adminAuthService.signOut();
  };

  const isAuthenticated = devSession || user !== null;

  const value: AuthContextValue = {
    user,
    admin,
    loading,
    isAuthenticated,
    hasPermission: (p) => (devSession ? true : adminAuthService.hasPermission(p)),
    signInDev,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
