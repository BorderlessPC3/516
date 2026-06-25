'use client';

import { coinSettingsSchema, type CoinSettingsInput, FIRESTORE_COLLECTIONS } from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/services/firebase/client';
import { auth } from '@/services/firebase/client';

export default function CoinsPage() {
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit } = useForm<CoinSettingsInput>({
    resolver: zodResolver(coinSettingsSchema),
    defaultValues: { rewardAmount: 1, requiredForReward: 10, expirationDays: 365 },
  });

  const onSubmit = async (data: CoinSettingsInput) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, 'coinSettings'), {
      key: 'coinSettings',
      value: data,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold mb-8">Configuração de Moedas</h1>
      <Card>
        <CardHeader>
          <CardTitle>Regras de Recompensa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Moedas por campanha concluída</label>
              <Input type="number" {...register('rewardAmount', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="text-sm font-medium">Moedas necessárias para recompensa</label>
              <Input type="number" {...register('requiredForReward', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="text-sm font-medium">Dias para expiração (opcional)</label>
              <Input type="number" {...register('expirationDays', { valueAsNumber: true })} />
            </div>
            <Button type="submit">Salvar Configurações</Button>
            {saved && <p className="text-green-400 text-sm">Salvo com sucesso!</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
