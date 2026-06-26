'use client';

import {
  drawSchema,
  type DrawInput,
  DrawStatus,
  FIRESTORE_COLLECTIONS,
  type Prize,
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

export default function NewDrawPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<DrawInput>({
    resolver: zodResolver(drawSchema),
    defaultValues: { status: DrawStatus.SCHEDULED, winnerCount: 1, rules: 'Participação sujeita ao regulamento.' },
  });

  const { data: prizes = [] } = useQuery({
    queryKey: ['prizes-list'],
    queryFn: () => listDocuments<Prize>(FIRESTORE_COLLECTIONS.PRIZES),
  });

  const mutation = useMutation({
    mutationFn: async (data: DrawInput) => {
      const createDraw = httpsCallable(functions, 'createDraw');
      await createDraw(data);
    },
    onSuccess: () => router.push('/draws'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Novo Sorteio</h1>
      <Card>
        <CardHeader><CardTitle>Dados do Sorteio</CardTitle></CardHeader>
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
              <label className="text-sm font-medium">Prêmio</label>
              <select {...register('prizeId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                <option value="">Selecione</option>
                {prizes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Data do Sorteio</label>
                <Input type="datetime-local" {...register('drawDate')} />
              </div>
              <div>
                <label className="text-sm font-medium">Data Encerramento</label>
                <Input type="datetime-local" {...register('endDate')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <select {...register('status')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                  {Object.values(DrawStatus).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Vencedores</label>
                <Input type="number" {...register('winnerCount', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="text-sm font-medium">Moedas mínimas</label>
                <Input type="number" {...register('minCoinsRequired', { valueAsNumber: true })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Regras</label>
              <Input {...register('rules')} />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Criar Sorteio'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
