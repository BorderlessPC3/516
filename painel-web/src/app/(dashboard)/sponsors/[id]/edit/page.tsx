'use client';

import {
  sponsorSchema,
  type SponsorInput,
  FIRESTORE_COLLECTIONS,
  type CampaignVideo,
  type Prize,
  type Sponsor,
  SocialNetwork,
} from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getDocument, listDocuments, updateDocument } from '@/services/firebase/firestore.service';

const SOCIAL_FIELDS = [
  { key: SocialNetwork.INSTAGRAM, label: 'Instagram' },
  { key: SocialNetwork.FACEBOOK, label: 'Facebook' },
  { key: SocialNetwork.TIKTOK, label: 'TikTok' },
  { key: SocialNetwork.WHATSAPP, label: 'WhatsApp' },
] as const;

export default function EditSponsorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { data: sponsor } = useQuery({
    queryKey: ['sponsor', params.id],
    queryFn: () => getDocument<Sponsor>(FIRESTORE_COLLECTIONS.SPONSORS, params.id),
    enabled: !!params.id,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['videos-list'],
    queryFn: () => listDocuments<CampaignVideo>(FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS),
  });

  const { data: prizes = [] } = useQuery({
    queryKey: ['prizes-list'],
    queryFn: () => listDocuments<Prize>(FIRESTORE_COLLECTIONS.PRIZES),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SponsorInput>({
    resolver: zodResolver(sponsorSchema),
  });

  useEffect(() => {
    if (sponsor) {
      reset({
        name: sponsor.name,
        description: sponsor.description,
        logoUrl: sponsor.logoUrl,
        videoId: sponsor.videoId,
        prizeId: sponsor.prizeId,
        socialLinks: sponsor.socialLinks ?? {},
        isActive: sponsor.isActive,
      });
    }
  }, [sponsor, reset]);

  const mutation = useMutation({
    mutationFn: async (data: SponsorInput) => {
      const prize = prizes.find((p) => p.id === data.prizeId);
      return updateDocument(FIRESTORE_COLLECTIONS.SPONSORS, params.id, {
        ...data,
        prizeName: prize?.name,
      });
    },
    onSuccess: () => router.push('/sponsors'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Editar Patrocinador</h1>
      <Card>
        <CardHeader><CardTitle>{sponsor?.name}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input {...register('name')} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input {...register('description')} />
            </div>
            <div>
              <label className="text-sm font-medium">Logo URL</label>
              <Input {...register('logoUrl')} />
            </div>
            <div>
              <label className="text-sm font-medium">Vídeo</label>
              <select {...register('videoId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                <option value="">Selecione</option>
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Prêmio</label>
              <select {...register('prizeId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                <option value="">Selecione</option>
                {prizes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {SOCIAL_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="text-sm font-medium">{label}</label>
                <Input {...register(`socialLinks.${key}`)} />
              </div>
            ))}
            <Button type="submit" disabled={mutation.isPending}>Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
