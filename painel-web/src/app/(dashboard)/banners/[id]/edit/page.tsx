'use client';

import { bannerSchema, type BannerInput, FIRESTORE_COLLECTIONS, BannerScope, type Banner } from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getDocument, updateDocument } from '@/services/firebase/firestore.service';

export default function EditBannerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { data: banner } = useQuery({
    queryKey: ['banner', params.id],
    queryFn: () => getDocument<Banner>(FIRESTORE_COLLECTIONS.BANNERS, params.id),
    enabled: !!params.id,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BannerInput>({
    resolver: zodResolver(bannerSchema),
  });

  useEffect(() => {
    if (banner) {
      reset({
        title: banner.title,
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl,
        linkCampaignId: banner.linkCampaignId,
        scope: banner.scope,
        cityId: banner.cityId,
        state: banner.state,
        sponsorId: banner.sponsorId,
        rotationSeconds: banner.rotationSeconds,
        sequenceOrder: banner.sequenceOrder,
        isActive: banner.isActive,
      });
    }
  }, [banner, reset]);

  const mutation = useMutation({
    mutationFn: (data: BannerInput) => updateDocument(FIRESTORE_COLLECTIONS.BANNERS, params.id, data),
    onSuccess: () => router.push('/banners'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Editar Banner</h1>
      <Card>
        <CardHeader><CardTitle>{banner?.title}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input {...register('title')} />
              {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">URL da Imagem</label>
              <Input {...register('imageUrl')} />
            </div>
            <div>
              <label className="text-sm font-medium">Escopo</label>
              <select {...register('scope')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                {Object.values(BannerScope).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Rotação (segundos)</label>
                <Input type="number" {...register('rotationSeconds', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="text-sm font-medium">Ativo</label>
                <select {...register('isActive')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={mutation.isPending}>Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
