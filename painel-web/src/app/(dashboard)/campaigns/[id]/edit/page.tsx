'use client';

import { campaignSchema, type CampaignInput, CampaignScope, CampaignStatus, FIRESTORE_COLLECTIONS } from '@herois/shared';
import type { Campaign } from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getDocument, updateDocument } from '@/services/firebase/firestore.service';

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { data: campaign } = useQuery({
    queryKey: ['campaign', params.id],
    queryFn: () => getDocument<Campaign>(FIRESTORE_COLLECTIONS.CAMPAIGNS, params.id),
    enabled: !!params.id,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
  });

  useEffect(() => {
    if (campaign) {
      reset({
        name: campaign.name,
        description: campaign.description,
        scope: campaign.scope,
        status: campaign.status,
        startDate: String(campaign.startDate).slice(0, 16),
        endDate: String(campaign.endDate).slice(0, 16),
        coinReward: campaign.coinReward,
        requiredSocialNetworks: campaign.requiredSocialNetworks,
      });
    }
  }, [campaign, reset]);

  const mutation = useMutation({
    mutationFn: (data: CampaignInput) => updateDocument(FIRESTORE_COLLECTIONS.CAMPAIGNS, params.id, data),
    onSuccess: () => router.push('/campaigns'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Editar Campanha</h1>
      <Card>
        <CardHeader><CardTitle>{campaign?.name ?? 'Campanha'}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input {...register('name')} />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Data Início</label>
                <Input type="datetime-local" {...register('startDate')} />
              </div>
              <div>
                <label className="text-sm font-medium">Data Fim</label>
                <Input type="datetime-local" {...register('endDate')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Escopo</label>
                <select {...register('scope')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                  {Object.values(CampaignScope).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select {...register('status')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                  {Object.values(CampaignStatus).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Moedas de Recompensa</label>
              <Input type="number" {...register('coinReward', { valueAsNumber: true })} />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
