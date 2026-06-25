'use client';

import type { Coupon } from '@herois/shared';
import { FIRESTORE_COLLECTIONS, formatDate, toDate } from '@herois/shared';
import { Permission } from '@herois/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { listDocuments, deleteDocument } from '@/services/firebase/firestore.service';

export default function CouponsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const { data: coupons = [] } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => listDocuments<Coupon>(FIRESTORE_COLLECTIONS.COUPONS),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(FIRESTORE_COLLECTIONS.COUPONS, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Cupons</h1>
        {hasPermission(Permission.COUPONS_WRITE) && (
          <Link href="/coupons/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </Link>
        )}
      </div>
      <div className="grid gap-4">
        {coupons.map((coupon) => (
          <Card key={coupon.id}>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle className="font-mono text-primary">{coupon.code}</CardTitle>
              {hasPermission(Permission.COUPONS_DELETE) && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteMutation.mutate(coupon.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p>Campanha: {coupon.campaignName || coupon.campaignId}</p>
              <p className="text-sm text-muted-foreground">
                Usuário: {coupon.userName || coupon.userPhone || coupon.userId}
              </p>
              <p className="text-sm">
                Validade: {formatDate(toDate(coupon.validUntil))} • {coupon.status}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
