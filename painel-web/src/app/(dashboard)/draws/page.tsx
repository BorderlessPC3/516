'use client';

import type { Draw } from '@herois/shared';
import { FIRESTORE_COLLECTIONS, formatDateTime, toDate } from '@herois/shared';
import { Permission } from '@herois/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { functions } from '@/services/firebase/client';
import { listDocuments, deleteDocument } from '@/services/firebase/firestore.service';

export default function DrawsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const { data: draws = [] } = useQuery({
    queryKey: ['draws'],
    queryFn: () => listDocuments<Draw>(FIRESTORE_COLLECTIONS.DRAWS),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(FIRESTORE_COLLECTIONS.DRAWS, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['draws'] }),
  });

  const executeMutation = useMutation({
    mutationFn: async (drawId: string) => {
      const executeDraw = httpsCallable(functions, 'executeDraw');
      await executeDraw({ drawId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['draws'] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Sorteios</h1>
        {hasPermission(Permission.DRAWS_WRITE) && (
          <Link href="/draws/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Sorteio
            </Button>
          </Link>
        )}
      </div>
      <div className="grid gap-4">
        {draws.map((draw) => (
          <Card key={draw.id}>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle>{draw.name}</CardTitle>
              <div className="flex gap-2">
                {hasPermission(Permission.DRAWS_WRITE) && draw.status !== 'DRAWN' && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => executeMutation.mutate(draw.id)}
                    title="Executar sorteio"
                  >
                    <Trophy className="h-4 w-4" />
                  </Button>
                )}
                {hasPermission(Permission.DRAWS_DELETE) && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteMutation.mutate(draw.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p>Prêmio: {draw.prizeName}</p>
              <p className="text-sm text-muted-foreground">
                Sorteio: {formatDateTime(toDate(draw.drawDate))}
              </p>
              <p className="text-sm">
                Status: {draw.status} • Participantes: {draw.participantCount}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
