'use client';

import {
  FIRESTORE_COLLECTIONS,
  SETTINGS_KEYS,
  type ScratchCardPrize,
  type CoinRewardCatalogItem,
} from '@herois/shared';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { auth, db } from '@/services/firebase/client';

export default function ScratchRewardsPage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState('');
  const [scratchPrizes, setScratchPrizes] = useState<ScratchCardPrize[]>([]);
  const [scratchActive, setScratchActive] = useState(true);
  const [coinRewards, setCoinRewards] = useState<CoinRewardCatalogItem[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['scratch-coin-settings'],
    queryFn: async () => {
      const [scratchSnap, rewardsSnap] = await Promise.all([
        getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, SETTINGS_KEYS.SCRATCH_CARD)),
        getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, SETTINGS_KEYS.COIN_REWARDS)),
      ]);
      return {
        scratch: (scratchSnap.data()?.value as { prizes: ScratchCardPrize[]; isActive: boolean }) ?? {
          isActive: true,
          prizes: [
            { id: 'p1', name: 'Cortador de Pizza', weight: 30 },
            { id: 'p2', name: 'Refrigerante', weight: 40 },
            { id: 'p3', name: 'Brinde', weight: 30 },
          ],
        },
        rewards: (rewardsSnap.data()?.value as { rewards: CoinRewardCatalogItem[] }) ?? {
          rewards: [{ id: 'r1', name: '50% desconto em pizza', coinCost: 15, isActive: true }],
        },
      };
    },
  });

  useEffect(() => {
    if (data) {
      setScratchPrizes(data.scratch.prizes);
      setScratchActive(data.scratch.isActive);
      setCoinRewards(data.rewards.rewards);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const uid = auth.currentUser?.uid ?? 'admin';
      await Promise.all([
        setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, SETTINGS_KEYS.SCRATCH_CARD), {
          key: SETTINGS_KEYS.SCRATCH_CARD,
          value: { isActive: scratchActive, prizes: scratchPrizes },
          updatedBy: uid,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }),
        setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, SETTINGS_KEYS.COIN_REWARDS), {
          key: SETTINGS_KEYS.COIN_REWARDS,
          value: { rewards: coinRewards },
          updatedBy: uid,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scratch-coin-settings'] });
      setSaved('Configurações salvas!');
      setTimeout(() => setSaved(''), 3000);
    },
  });

  if (isLoading) return <p>Carregando...</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Raspadinha e Resgates</h1>

      <Card>
        <CardHeader><CardTitle>Raspadinha (cadastro)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={scratchActive} onChange={(e) => setScratchActive(e.target.checked)} />
            Raspadinha ativa
          </label>
          {scratchPrizes.map((prize, index) => (
            <div key={prize.id} className="grid grid-cols-3 gap-2">
              <Input
                value={prize.name}
                onChange={(e) => {
                  const next = [...scratchPrizes];
                  next[index] = { ...prize, name: e.target.value };
                  setScratchPrizes(next);
                }}
                placeholder="Nome do prêmio"
              />
              <Input
                type="number"
                value={prize.weight}
                onChange={(e) => {
                  const next = [...scratchPrizes];
                  next[index] = { ...prize, weight: Number(e.target.value) };
                  setScratchPrizes(next);
                }}
                placeholder="Peso"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Catálogo de resgate de moedas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {coinRewards.map((reward, index) => (
            <div key={reward.id} className="grid grid-cols-3 gap-2">
              <Input
                value={reward.name}
                onChange={(e) => {
                  const next = [...coinRewards];
                  next[index] = { ...reward, name: e.target.value };
                  setCoinRewards(next);
                }}
              />
              <Input
                type="number"
                value={reward.coinCost}
                onChange={(e) => {
                  const next = [...coinRewards];
                  next[index] = { ...reward, coinCost: Number(e.target.value) };
                  setCoinRewards(next);
                }}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCoinRewards([
                ...coinRewards,
                { id: `r${Date.now()}`, name: 'Nova recompensa', coinCost: 10, isActive: true },
              ])
            }
          >
            Adicionar recompensa
          </Button>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        Salvar
      </Button>
      {saved && <p className="text-green-500 text-sm">{saved}</p>}
    </div>
  );
}
