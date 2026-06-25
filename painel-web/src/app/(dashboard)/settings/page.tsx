'use client';

import { FIRESTORE_COLLECTIONS } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/services/firebase/client';

export default function SettingsPage() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const keys = [
        'coinRewardAmount',
        'coinRequiredForReward',
        'videoCompletionThreshold',
        'maintenanceMode',
      ];
      const results: Record<string, unknown> = {};
      for (const key of keys) {
        const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, key));
        if (snap.exists()) results[key] = snap.data().value;
      }
      return results;
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Configurações</h1>
      <Card>
        <CardHeader>
          <CardTitle>Configurações Globais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings ? (
            Object.entries(settings).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b border-border pb-2">
                <span className="font-medium">{key}</span>
                <span className="text-muted-foreground">{String(value)}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">Carregando...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
