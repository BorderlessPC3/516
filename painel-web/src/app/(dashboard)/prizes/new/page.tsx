'use client';

import { prizeSchema, type PrizeInput, PrizeType, FIRESTORE_COLLECTIONS } from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { auth } from '@/services/firebase/client';
import { createDocument } from '@/services/firebase/firestore.service';

export default function NewPrizePage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<PrizeInput>({
    resolver: zodResolver(prizeSchema),
    defaultValues: { type: PrizeType.OTHER, quantity: 1, isActive: true },
  });

  const mutation = useMutation({
    mutationFn: async (data: PrizeInput) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Não autenticado');
      return createDocument(FIRESTORE_COLLECTIONS.PRIZES, data, uid);
    },
    onSuccess: () => router.push('/prizes'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Novo Prêmio</h1>
      <Card>
        <CardHeader><CardTitle>Dados do Prêmio</CardTitle></CardHeader>
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
                <label className="text-sm font-medium">Tipo</label>
                <select {...register('type')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                  {Object.values(PrizeType).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Quantidade</label>
                <Input type="number" {...register('quantity', { valueAsNumber: true })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">URL da Imagem</label>
              <Input {...register('imageUrl')} />
            </div>
            <div>
              <label className="text-sm font-medium">Valor Estimado (R$)</label>
              <Input type="number" step="0.01" {...register('estimatedValue', { valueAsNumber: true })} />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Criar Prêmio'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
