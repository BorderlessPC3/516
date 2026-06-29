'use client';

import type { Banner } from '@herois/shared';
import { FIRESTORE_COLLECTIONS, Permission } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { listDocuments } from '@/services/firebase/firestore.service';

export default function BannersPage() {
  const { hasPermission } = useAuth();

  const { data: banners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: () => listDocuments<Banner>(FIRESTORE_COLLECTIONS.BANNERS),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Banners</h1>
        {hasPermission(Permission.BANNERS_WRITE) && (
          <Link href="/banners/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Banner
            </Button>
          </Link>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {banners.map((banner) => (
          <Card key={banner.id}>
            <CardHeader>
              <CardTitle>{banner.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{banner.scope}</p>
              <p className="text-sm mt-1">Rotação: {banner.rotationSeconds}s</p>
              <p className={`text-sm mt-2 ${banner.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                {banner.isActive ? 'Ativo' : 'Inativo'}
              </p>
              {hasPermission(Permission.BANNERS_WRITE) && (
                <Link href={`/banners/${banner.id}/edit`}>
                  <Button variant="outline" size="sm" className="mt-4">Editar</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
