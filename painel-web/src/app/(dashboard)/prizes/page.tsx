'use client';

import type { Prize } from '@herois/shared';
import { FIRESTORE_COLLECTIONS, PrizeType } from '@herois/shared';
import { Permission } from '@herois/shared';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { listDocuments } from '@/services/firebase/firestore.service';

const PRIZE_LABELS: Record<PrizeType, string> = {
  AIR_FRYER: 'Air Fryer',
  FUEL: 'Combustível',
  GIFT_CARD: 'Vale Compra',
  OTHER: 'Outros',
};

export default function PrizesPage() {
  const { hasPermission } = useAuth();

  const { data: prizes = [] } = useQuery({
    queryKey: ['prizes'],
    queryFn: () => listDocuments<Prize>(FIRESTORE_COLLECTIONS.PRIZES),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Prêmios</h1>
        {hasPermission(Permission.PRIZES_WRITE) && (
          <Link href="/prizes/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Prêmio
            </Button>
          </Link>
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {prizes.map((prize) => (
          <Card key={prize.id}>
            <CardHeader>
              <CardTitle>{prize.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {PRIZE_LABELS[prize.type as PrizeType] || prize.type}
              </p>
              <p className="mt-2">Quantidade: {prize.quantity}</p>
              <p className={`text-sm ${prize.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                {prize.isActive ? 'Ativo' : 'Inativo'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
