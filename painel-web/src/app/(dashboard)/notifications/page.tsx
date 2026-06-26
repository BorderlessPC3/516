'use client';

import {
  notificationSchema,
  type NotificationInput,
  NotificationType,
  NotificationAudience,
} from '@herois/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { functions } from '@/services/firebase/client';
import { FIRESTORE_COLLECTIONS, listDocuments } from '@/services/firebase/firestore.service';
import type { Notification } from '@herois/shared';
import { formatDateTime, toDate } from '@herois/shared';

export default function NotificationsPage() {
  const [result, setResult] = useState<string>('');

  const { register, handleSubmit, watch } = useForm<NotificationInput & { sendNow?: boolean }>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      type: NotificationType.PROMOTION,
      audience: NotificationAudience.ALL,
      sendNow: true,
    },
  });

  const audience = watch('audience');
  const scheduledAt = watch('scheduledAt');

  const { data: history = [] } = useQuery({
    queryKey: ['notifications-history'],
    queryFn: () => listDocuments<Notification>(FIRESTORE_COLLECTIONS.NOTIFICATIONS, 50),
  });

  const mutation = useMutation({
    mutationFn: async (data: NotificationInput & { sendNow?: boolean }) => {
      const sendPush = httpsCallable(functions, 'sendPushNotification');
      const response = await sendPush({ ...data, sendNow: !data.scheduledAt || data.sendNow });
      return response.data as { sentCount: number; scheduled?: boolean; notificationId: string };
    },
    onSuccess: (data) => {
      setResult(
        data.scheduled
          ? `Agendado (ID: ${data.notificationId})`
          : `Enviado para ${data.sentCount} dispositivos`,
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const cancel = httpsCallable(functions, 'cancelScheduledNotification');
      await cancel({ notificationId });
    },
  });

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold">Push Notifications</h1>
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
                <select {...register('type')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                  {Object.values(NotificationType).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Público</label>
                <select {...register('audience')} className="flex h-10 w-full rounded-md border border-input bg-background px-3">
                  {Object.values(NotificationAudience).map((a) => (
                    <option key={a} value={a}>{a}</option>
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
            {audience === NotificationAudience.STATE && (
              <div>
                <label className="text-sm font-medium">Estado (UF)</label>
                <Input {...register('targetState')} placeholder="SP" />
              </div>
            )}
            {audience === NotificationAudience.CAMPAIGN && (
              <div>
                <label className="text-sm font-medium">ID da Campanha</label>
                <Input {...register('targetCampaignId')} />
              </div>
            )}
            {audience === NotificationAudience.USER && (
              <div>
                <label className="text-sm font-medium">ID do Usuário</label>
                <Input {...register('targetUserId')} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Agendar para (opcional)</label>
              <Input type="datetime-local" {...register('scheduledAt')} />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enviando...' : scheduledAt ? 'Agendar' : 'Enviar Agora'}
            </Button>
            {result && <p className="text-green-400 text-sm">{result}</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {history.map((n) => (
            <div key={n.id} className="flex justify-between items-center border-b border-border pb-2">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">
                  {n.status} • {n.sentCount ?? 0} enviados • {n.audience}
                </p>
                {n.scheduledAt && (
                  <p className="text-xs text-muted-foreground">
                    Agendado: {formatDateTime(toDate(n.scheduledAt))}
                  </p>
                )}
              </div>
              {n.status === 'SCHEDULED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelMutation.mutate(n.id)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
