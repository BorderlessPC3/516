'use client';

import {
  sponsorSchema,
  type SponsorInput,
  FIRESTORE_COLLECTIONS,
  type CampaignVideo,
  type Prize,
  SocialNetwork,
} from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { auth } from '@/services/firebase/client';
import { createDocument, listDocuments } from '@/services/firebase/firestore.service';

const SOCIAL_FIELDS = [
  { key: SocialNetwork.INSTAGRAM, label: 'Instagram' },
  { key: SocialNetwork.FACEBOOK, label: 'Facebook' },
  { key: SocialNetwork.TIKTOK, label: 'TikTok' },
  { key: SocialNetwork.WHATSAPP, label: 'WhatsApp' },
] as const;

export default function NewSponsorPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<SponsorInput>({
    resolver: zodResolver(sponsorSchema),
    defaultValues: { isActive: true, socialLinks: {} },
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['videos-list'],
    queryFn: () => listDocuments<CampaignVideo>(FIRESTORE_COLLECTIONS.CAMPAIGN_VIDEOS),
  });

  const { data: prizes = [] } = useQuery({
    queryKey: ['prizes-list'],
    queryFn: () => listDocuments<Prize>(FIRESTORE_COLLECTIONS.PRIZES),
  });

  const mutation = useMutation({
    mutationFn: async (data: SponsorInput) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Não autenticado');
      const prize = prizes.find((p) => p.id === data.prizeId);
      return createDocument(
        FIRESTORE_COLLECTIONS.SPONSORS,
        { ...data, prizeName: prize?.name, socialLinks: data.socialLinks ?? {} },
        uid,
      );
    },
    onSuccess: () => router.push('/sponsors'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Novo Patrocinador</h1>
      <Card>
        <CardHeader><CardTitle>Dados do Patrocinador</CardTitle></CardHeader>
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
              <label className="text-sm font-medium">Logo URL</label>
              <Input {...register('logoUrl')} placeholder="https://..." />
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
                <Input {...register(`socialLinks.${key}`)} placeholder="https://..." />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium">Ativo</label>
              <select {...register('isActive')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar Patrocinador'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
