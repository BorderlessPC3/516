'use client';

import {
  notificationSchema,
  type NotificationInput,
  NotificationType,
  NotificationAudience,
} from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { functions } from '@/services/firebase/client';

export default function NotificationsPage() {
  const [result, setResult] = useState<string>('');

  const { register, handleSubmit, watch } = useForm<NotificationInput>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      type: NotificationType.PROMOTION,
      audience: NotificationAudience.ALL,
    },
  });

  const audience = watch('audience');

  const mutation = useMutation({
    mutationFn: async (data: NotificationInput) => {
      const sendPush = httpsCallable(functions, 'sendPushNotification');
      const response = await sendPush(data);
      return response.data as { sentCount: number };
    },
    onSuccess: (data) => setResult(`Enviado para ${data.sentCount} dispositivos`),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Push Notifications</h1>
      <Card>
        <CardHeader>
          <CardTitle>Enviar Notificação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input {...register('title')} />
            </div>
            <div>
              <label className="text-sm font-medium">Mensagem</label>
              <Input {...register('body')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <select
                  {...register('type')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3"
                >
                  {Object.values(NotificationType).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Público</label>
                <select
                  {...register('audience')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3"
                >
                  {Object.values(NotificationAudience).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {audience === NotificationAudience.CITY && (
              <div>
                <label className="text-sm font-medium">ID da Cidade</label>
                <Input {...register('targetCityId')} />
              </div>
            )}
            {audience === NotificationAudience.CAMPAIGN && (
              <div>
                <label className="text-sm font-medium">ID da Campanha</label>
                <Input {...register('targetCampaignId')} />
              </div>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enviando...' : 'Enviar Notificação'}
            </Button>
            {result && <p className="text-green-400 text-sm">{result}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
