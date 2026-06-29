'use client';

import { bannerSchema, type BannerInput, FIRESTORE_COLLECTIONS, BannerScope } from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { auth } from '@/services/firebase/client';
import { createDocument } from '@/services/firebase/firestore.service';

export default function NewBannerPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<BannerInput>({
    resolver: zodResolver(bannerSchema),
    defaultValues: { scope: BannerScope.NATIONAL, rotationSeconds: 5, sequenceOrder: 0, isActive: true },
  });

  const mutation = useMutation({
    mutationFn: async (data: BannerInput) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Não autenticado');
      return createDocument(FIRESTORE_COLLECTIONS.BANNERS, data, uid);
    },
    onSuccess: () => router.push('/banners'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Novo Banner</h1>
      <Card>
        <CardHeader><CardTitle>Dados do Banner</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input {...register('title')} />
              {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">URL da Imagem</label>
              <Input {...register('imageUrl')} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium">Link (opcional)</label>
              <Input {...register('linkUrl')} />
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
                <label className="text-sm font-medium">Estado (regional)</label>
                <Input {...register('state')} placeholder="SP" />
              </div>
              <div>
                <label className="text-sm font-medium">Cidade ID (municipal)</label>
                <Input {...register('cityId')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Rotação (segundos)</label>
                <Input type="number" {...register('rotationSeconds', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="text-sm font-medium">Ordem</label>
                <Input type="number" {...register('sequenceOrder', { valueAsNumber: true })} />
              </div>
            </div>
            <Button type="submit" disabled={mutation.isPending}>Criar Banner</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
