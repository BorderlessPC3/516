'use client';

import {
  couponTemplateSchema,
  type CouponTemplateInput,
  FIRESTORE_COLLECTIONS,
  MAX_PIZZA_COUPONS_PER_PURCHASE,
  type Campaign,
  type User,
} from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { functions } from '@/services/firebase/client';
import { listDocuments } from '@/services/firebase/firestore.service';

export default function NewCouponPage() {
  const router = useRouter();
  const [pizzaCampaignId, setPizzaCampaignId] = useState('');
  const [pizzaUserId, setPizzaUserId] = useState('');
  const [pizzaCount, setPizzaCount] = useState(1);
  const [pizzaResult, setPizzaResult] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<CouponTemplateInput>({
    resolver: zodResolver(couponTemplateSchema),
    defaultValues: { quantity: 1, isActive: true, rules: 'Válido conforme regulamento da campanha.' },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn: () => listDocuments<Campaign>(FIRESTORE_COLLECTIONS.CAMPAIGNS),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => listDocuments<User>(FIRESTORE_COLLECTIONS.USERS, 100),
  });

  const pizzaMutation = useMutation({
    mutationFn: async () => {
      const fn = httpsCallable(functions, 'generatePurchaseCoupons');
      const res = await fn({ campaignId: pizzaCampaignId, userId: pizzaUserId, pizzaCount });
      return res.data as { couponIds: string[]; count: number };
    },
    onSuccess: (data) => {
      setPizzaResult(`${data.count} cupom(ns) gerado(s): ${data.couponIds.join(', ')}`);
    },
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

      <Card className="mt-8">
        <CardHeader><CardTitle>Cupons por Compra de Pizza</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gera 1 a {MAX_PIZZA_COUPONS_PER_PURCHASE} cupons por compra (1 pizza = 1 código).
          </p>
          <div>
            <label className="text-sm font-medium">Campanha</label>
            <select
              value={pizzaCampaignId}
              onChange={(e) => setPizzaCampaignId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="">Selecione</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Usuário</label>
            <select
              value={pizzaUserId}
              onChange={(e) => setPizzaUserId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="">Selecione</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} — {u.phone}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Quantidade de pizzas (máx. {MAX_PIZZA_COUPONS_PER_PURCHASE})</label>
            <Input
              type="number"
              min={1}
              max={MAX_PIZZA_COUPONS_PER_PURCHASE}
              value={pizzaCount}
              onChange={(e) => setPizzaCount(Number(e.target.value))}
            />
          </div>
          <Button
            type="button"
            onClick={() => pizzaMutation.mutate()}
            disabled={!pizzaCampaignId || !pizzaUserId || pizzaMutation.isPending}
          >
            {pizzaMutation.isPending ? 'Gerando...' : 'Gerar Cupons'}
          </Button>
          {pizzaResult && <p className="text-sm text-green-500">{pizzaResult}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
