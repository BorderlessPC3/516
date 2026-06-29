'use client';

import type { Sponsor } from '@herois/shared';
import { FIRESTORE_COLLECTIONS, Permission, buildSponsorQrPayload } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { Plus, QrCode } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { listDocuments } from '@/services/firebase/firestore.service';

export default function SponsorsPage() {
  const { hasPermission } = useAuth();

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => listDocuments<Sponsor>(FIRESTORE_COLLECTIONS.SPONSORS),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Patrocinadores</h1>
        {hasPermission(Permission.SPONSORS_WRITE) && (
          <Link href="/sponsors/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Patrocinador
            </Button>
          </Link>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {sponsors.map((sponsor) => (
          <Card key={sponsor.id}>
            <CardHeader>
              <CardTitle>{sponsor.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{sponsor.prizeName || 'Sem prêmio'}</p>
              <p className={`text-sm mt-2 ${sponsor.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                {sponsor.isActive ? 'Ativo' : 'Inativo'}
              </p>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <QrCode className="h-3 w-3" />
                {buildSponsorQrPayload(sponsor.id)}
              </p>
              {hasPermission(Permission.SPONSORS_WRITE) && (
                <Link href={`/sponsors/${sponsor.id}/edit`}>
                  <Button variant="outline" size="sm" className="mt-4">
                    Editar
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
