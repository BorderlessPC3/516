'use client';

import {
  campaignSchema,
  type CampaignInput,
  CampaignScope,
  CampaignStatus,
  CampaignDisplayMode,
  FIRESTORE_COLLECTIONS,
  SocialNetwork,
  type Campaign,
  type Sponsor,
} from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getDocument, updateDocument, listDocuments } from '@/services/firebase/firestore.service';
import { getCampaignSponsorIds, syncCampaignSponsors } from '@/services/campaign-sponsors.service';

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [selectedSponsors, setSelectedSponsors] = useState<string[]>([]);

  const { data: campaign } = useQuery({
    queryKey: ['campaign', params.id],
    queryFn: () => getDocument<Campaign>(FIRESTORE_COLLECTIONS.CAMPAIGNS, params.id),
    enabled: !!params.id,
  });

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors-list'],
    queryFn: () => listDocuments<Sponsor>(FIRESTORE_COLLECTIONS.SPONSORS),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
  });

  useEffect(() => {
    if (campaign) {
      reset({
        name: campaign.name,
        description: campaign.description,
        bannerUrl: campaign.bannerUrl,
        scope: campaign.scope,
        status: campaign.status,
        displayMode: campaign.displayMode ?? CampaignDisplayMode.EXPANDED,
        startDate: String(campaign.startDate).slice(0, 16),
        endDate: String(campaign.endDate).slice(0, 16),
        coinReward: campaign.coinReward,
        requiredSocialNetworks: campaign.requiredSocialNetworks,
      });
      setSelectedSponsors(campaign.sponsorIds ?? []);
    }
  }, [campaign, reset]);

  useEffect(() => {
    if (params.id) {
      getCampaignSponsorIds(params.id).then(setSelectedSponsors);
    }
  }, [params.id]);

  const mutation = useMutation({
    mutationFn: async (data: CampaignInput) => {
      await updateDocument(FIRESTORE_COLLECTIONS.CAMPAIGNS, params.id, {
        ...data,
        sponsorIds: selectedSponsors,
      });
      await syncCampaignSponsors(params.id, selectedSponsors, sponsors);
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
              <label className="text-sm font-medium">Banner URL</label>
              <Input {...register('bannerUrl')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Modo de Exibição</label>
                <select {...register('displayMode')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                  {Object.values(CampaignDisplayMode).map((m) => (
                    <option key={m} value={m}>{m}</option>
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
              <label className="text-sm font-medium mb-2 block">Patrocinadores</label>
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
              {selectedSponsors.map((id, index) => {
                const sponsor = sponsors.find((s) => s.id === id);
                return (
                  <div key={id} className="flex items-center gap-2 text-sm mt-1">
                    <span>{index + 1}. {sponsor?.name}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => moveSponsor(index, -1)}>↑</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => moveSponsor(index, 1)}>↓</Button>
                  </div>
                );
              })}
            </div>
            <Button type="submit" disabled={mutation.isPending}>Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
