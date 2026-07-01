'use client';

import { buildCampaignAppDeepLink } from '@herois/shared';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface CampaignQrCardProps {
  campaignId: string;
  qrUrl: string;
}

export function CampaignQrCard({ campaignId, qrUrl }: CampaignQrCardProps) {
  const qrImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrUrl)}&size=280&margin=2`;
  const appDeepLink = buildCampaignAppDeepLink(campaignId);

  const downloadQr = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `qr-campanha-${campaignId}.png`;
    link.target = '_blank';
    link.click();
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>QR Code da campanha</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Imprima este QR em panfletos, caixas de pizza e materiais. A câmera do celular abre o
          vídeo no navegador; se o app estiver instalado, abre direto no aplicativo.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="rounded-xl border bg-white p-3">
            <Image
              src={qrImageUrl}
              alt="QR Code da campanha"
              width={280}
              height={280}
              unoptimized
            />
          </div>
          <div className="flex-1 space-y-3 w-full">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Link universal (QR)</label>
              <Input readOnly value={qrUrl} className="font-mono text-xs mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Deep link do app</label>
              <Input readOnly value={appDeepLink} className="font-mono text-xs mt-1" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(qrUrl)}>
                Copiar link web
              </Button>
              <Button type="button" variant="outline" onClick={downloadQr}>
                Baixar QR (PNG)
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href={qrUrl} target="_blank" rel="noopener noreferrer">
                  Pré-visualizar landing
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
