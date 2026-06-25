'use client';

import type { Campaign } from '@herois/shared';
import { FIRESTORE_COLLECTIONS, formatDate, toDate } from '@herois/shared';
import { Permission } from '@herois/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { listDocuments, deleteDocument } from '@/services/firebase/firestore.service';

export default function CampaignsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => listDocuments<Campaign>(FIRESTORE_COLLECTIONS.CAMPAIGNS),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(FIRESTORE_COLLECTIONS.CAMPAIGNS, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Campanhas</h1>
        {hasPermission(Permission.CAMPAIGNS_WRITE) && (
          <Link href="/campaigns/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{campaign.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {campaign.cityName || 'Nacional'} • {campaign.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  {hasPermission(Permission.CAMPAIGNS_WRITE) && (
                    <Link href={`/campaigns/${campaign.id}/edit`}>
                      <Button variant="outline" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {hasPermission(Permission.CAMPAIGNS_DELETE) && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteMutation.mutate(campaign.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {formatDate(toDate(campaign.startDate))} — {formatDate(toDate(campaign.endDate))}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Views: {campaign.viewCount} • Conversões: {campaign.conversionCount}
                </p>
              </CardContent>
            </Card>
          ))}
          {campaigns.length === 0 && (
            <p className="text-muted-foreground">Nenhuma campanha cadastrada</p>
          )}
        </div>
      )}
    </div>
  );
}
