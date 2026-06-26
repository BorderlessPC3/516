'use client';

import {
  couponTemplateSchema,
  type CouponTemplateInput,
  FIRESTORE_COLLECTIONS,
  type Campaign,
} from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { functions } from '@/services/firebase/client';
import { listDocuments } from '@/services/firebase/firestore.service';

export default function NewCouponPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<CouponTemplateInput>({
    resolver: zodResolver(couponTemplateSchema),
    defaultValues: { quantity: 1, isActive: true, rules: 'Válido conforme regulamento da campanha.' },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn: () => listDocuments<Campaign>(FIRESTORE_COLLECTIONS.CAMPAIGNS),
  });

  const mutation = useMutation({
    mutationFn: async (data: CouponTemplateInput) => {
      const createTemplate = httpsCallable(functions, 'createCouponTemplate');
      await createTemplate(data);
    },
    onSuccess: () => router.push('/coupons'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Novo Cupom</h1>
      <Card>
        <CardHeader><CardTitle>Template de Cupom</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input {...register('name')} />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Campanha</label>
              <select {...register('campaignId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                <option value="">Selecione</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Quantidade</label>
                <Input type="number" {...register('quantity', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="text-sm font-medium">Ativo</label>
                <select {...register('isActive')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Válido de</label>
                <Input type="datetime-local" {...register('validFrom')} />
              </div>
              <div>
                <label className="text-sm font-medium">Válido até</label>
                <Input type="datetime-local" {...register('validUntil')} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Regras</label>
              <Input {...register('rules')} />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Criar Cupom'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
