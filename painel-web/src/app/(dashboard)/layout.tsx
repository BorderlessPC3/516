'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { isDevAuthEnabled } from '@/lib/dev-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { FirestoreStatusBanner } from '@/components/layout/firestore-status-banner';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, signInDev } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated && isDevAuthEnabled()) {
      signInDev();
      return;
    }
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router, signInDev]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <FirestoreStatusBanner />
        {children}
      </main>
    </div>
  );
}
