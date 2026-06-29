'use client';

import {
  campaignSchema,
  type CampaignInput,
  CampaignScope,
  CampaignStatus,
  CampaignDisplayMode,
  FIRESTORE_COLLECTIONS,
  SocialNetwork,
  type Sponsor,
} from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { auth } from '@/services/firebase/client';
import { createDocument, listDocuments } from '@/services/firebase/firestore.service';
import { syncCampaignSponsors } from '@/services/campaign-sponsors.service';

export default function NewCampaignPage() {
  const router = useRouter();
  const [selectedSponsors, setSelectedSponsors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      scope: CampaignScope.MUNICIPAL,
      status: CampaignStatus.DRAFT,
      coinReward: 1,
      requiredSocialNetworks: [],
      displayMode: CampaignDisplayMode.EXPANDED,
    },
  });

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors-list'],
    queryFn: () => listDocuments<Sponsor>(FIRESTORE_COLLECTIONS.SPONSORS),
  });

  const mutation = useMutation({
    mutationFn: async (data: CampaignInput) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Não autenticado');
      const campaignId = await createDocument(
        FIRESTORE_COLLECTIONS.CAMPAIGNS,
        {
          ...data,
          sponsorIds: selectedSponsors,
          viewCount: 0,
          conversionCount: 0,
        },
        uid,
      );
      if (selectedSponsors.length) {
        await syncCampaignSponsors(campaignId, selectedSponsors, sponsors);
      }
      return campaignId;
    },
    onSuccess: () => router.push('/campaigns'),
  });

  const toggleSponsor = (id: string) => {
    setSelectedSponsors((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const moveSponsor = (index: number, direction: -1 | 1) => {
    const next = [...selectedSponsors];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSelectedSponsors(next);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Nova Campanha</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados da Campanha</CardTitle>
        </CardHeader>
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
            <div>
              <label className="text-sm font-medium">Banner URL</label>
              <Input {...register('bannerUrl')} placeholder="https://..." />
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
                <select
                  {...register('scope')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3"
                >
                  {Object.values(CampaignScope).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Modo de Exibição</label>
                <select
                  {...register('displayMode')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3"
                >
                  {Object.values(CampaignDisplayMode).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  {...register('status')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3"
                >
                  {Object.values(CampaignStatus).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Moedas de Recompensa</label>
                <Input type="number" {...register('coinReward', { valueAsNumber: true })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Redes sociais exigidas</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(SocialNetwork).map((network) => (
                  <label key={network} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" value={network} {...register('requiredSocialNetworks')} />
                    {network}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Patrocinadores (ordem da sequência)</label>
              <div className="space-y-2">
                {sponsors.filter((s) => s.isActive).map((sponsor) => (
                  <label key={sponsor.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedSponsors.includes(sponsor.id)}
                      onChange={() => toggleSponsor(sponsor.id)}
                    />
                    {sponsor.name}
                  </label>
                ))}
              </div>
              {selectedSponsors.length > 0 && (
                <div className="mt-3 space-y-1">
                  {selectedSponsors.map((id, index) => {
                    const sponsor = sponsors.find((s) => s.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2 text-sm">
                        <span>{index + 1}. {sponsor?.name}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => moveSponsor(index, -1)}>↑</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => moveSponsor(index, 1)}>↓</Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Criar Campanha'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
