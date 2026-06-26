'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { isDevAuthEnabled } from '@/lib/dev-auth';
import { isFirebaseConfigured } from '@/services/firebase/client';
import {
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
  type AppSettingsForm,
} from '@/services/settings/settings.service';

const settingsFormSchema = z.object({
  appName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  supportEmail: z.string().email('E-mail inválido').or(z.literal('')),
  supportPhone: z.string().optional(),
  deepLinkDomain: z.string().min(3, 'Domínio inválido'),
  maintenanceMode: z.boolean(),
  coinRewardAmount: z.coerce.number().int().min(0),
  coinRequiredForReward: z.coerce.number().int().min(1),
  videoCompletionThreshold: z.coerce.number().min(0.5).max(1),
  coinSettings: z.object({
    rewardAmount: z.coerce.number().int().min(1),
    requiredForReward: z.coerce.number().int().min(1),
    expirationDays: z.coerce.number().int().min(0),
    campaignBonus: z.coerce.number().int().min(0),
    referralBonus: z.coerce.number().int().min(0),
    socialActionBonus: z.coerce.number().int().min(0),
  }),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { admin, user } = useAuth();
  const queryClient = useQueryClient();
  const [saveMessage, setSaveMessage] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['app-settings'],
    queryFn: loadAppSettings,
    staleTime: 30_000,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: DEFAULT_APP_SETTINGS,
  });

  useEffect(() => {
    if (data?.settings) {
      reset(data.settings);
    }
  }, [data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: AppSettingsForm) => {
      const uid = user?.uid ?? admin?.id ?? 'dev';
      return saveAppSettings(values, uid);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setSaveMessage(
        result.savedTo === 'firestore'
          ? 'Configurações salvas no Firestore.'
          : 'Salvo localmente (Firestore indisponível).',
      );
      setTimeout(() => setSaveMessage(''), 4000);
    },
    onError: () => {
      setSaveMessage('Erro ao salvar. Tente novamente.');
    },
  });

  const maintenanceMode = watch('maintenanceMode');
  const firebaseReady = isFirebaseConfigured();
  const dataSource = data?.source ?? 'default';

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Configurações</h1>
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Parâmetros globais do app e do painel administrativo.
        </p>
      </div>

      <div
        className={`rounded-lg border p-4 text-sm ${
          firebaseReady && dataSource === 'firestore'
            ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400'
            : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-400'
        }`}
      >
        {firebaseReady ? (
          dataSource === 'firestore' ? (
            <span>Conectado ao Firestore — alterações sincronizam com o backend.</span>
          ) : (
            <span>
              Firestore configurado mas indisponível. Usando dados locais do navegador.
              {isError && (
                <button type="button" className="ml-2 underline" onClick={() => refetch()}>
                  Tentar novamente
                </button>
              )}
            </span>
          )
        ) : (
          <span>
            Firebase não configurado. As configurações são salvas apenas neste navegador.
            {isDevAuthEnabled() && ' Modo desenvolvimento ativo.'}
          </span>
        )}
      </div>

      <form
        onSubmit={handleSubmit((values) => {
          const payload: AppSettingsForm = {
            ...values,
            supportPhone: values.supportPhone ?? '',
            coinSettings: {
              ...values.coinSettings,
              rewardAmount: values.coinRewardAmount,
              requiredForReward: values.coinRequiredForReward,
            },
          };
          saveMutation.mutate(payload);
        })}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Aplicativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do app</label>
              <Input {...register('appName')} />
              {errors.appName && (
                <p className="text-destructive text-sm mt-1">{errors.appName.message}</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">E-mail de suporte</label>
                <Input type="email" {...register('supportEmail')} placeholder="suporte@empresa.com" />
                {errors.supportEmail && (
                  <p className="text-destructive text-sm mt-1">{errors.supportEmail.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">WhatsApp de suporte</label>
                <Input {...register('supportPhone')} placeholder="+5511999999999" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Domínio (deep link)</label>
              <Input {...register('deepLinkDomain')} />
              {errors.deepLinkDomain && (
                <p className="text-destructive text-sm mt-1">{errors.deepLinkDomain.message}</p>
              )}
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('maintenanceMode')} className="h-4 w-4" />
              <span className="text-sm">
                Modo manutenção {maintenanceMode ? '(app bloqueado para usuários)' : ''}
              </span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moedas e recompensas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Moedas por campanha</label>
                <Input type="number" {...register('coinRewardAmount')} />
              </div>
              <div>
                <label className="text-sm font-medium">Moedas para resgatar prêmio</label>
                <Input type="number" {...register('coinRequiredForReward')} />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Bônus indicação</label>
                <Input type="number" {...register('coinSettings.referralBonus')} />
              </div>
              <div>
                <label className="text-sm font-medium">Bônus campanha extra</label>
                <Input type="number" {...register('coinSettings.campaignBonus')} />
              </div>
              <div>
                <label className="text-sm font-medium">Bônus rede social</label>
                <Input type="number" {...register('coinSettings.socialActionBonus')} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Expiração de moedas (dias)</label>
                <Input type="number" {...register('coinSettings.expirationDays')} />
              </div>
              <div>
                <label className="text-sm font-medium">Recompensa padrão (carteira)</label>
                <Input type="number" {...register('coinSettings.rewardAmount')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vídeos</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium">
                Percentual mínimo para conclusão (0.9 = 90%)
              </label>
              <Input
                type="number"
                step="0.05"
                min="0.5"
                max="1"
                {...register('videoCompletionThreshold')}
              />
              {errors.videoCompletionThreshold && (
                <p className="text-destructive text-sm mt-1">
                  {errors.videoCompletionThreshold.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saveMutation.isPending || !isDirty}>
            {saveMutation.isPending ? 'Salvando...' : 'Salvar configurações'}
          </Button>
          <Button type="button" variant="outline" onClick={() => reset(data?.settings ?? DEFAULT_APP_SETTINGS)}>
            Descartar alterações
          </Button>
          {saveMessage && <p className="text-sm text-green-500">{saveMessage}</p>}
        </div>
      </form>
    </div>
  );
}
