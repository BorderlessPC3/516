'use client';

import {
  buildCampaignAppDeepLink,
  type PublicCampaignPreview,
} from '@herois/shared';
import { httpsCallable } from 'firebase/functions';
import { useCallback, useEffect, useRef, useState } from 'react';

import { functions, isFirebaseConfigured } from '@/services/firebase/client';

interface CampaignLandingProps {
  campaignId: string;
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits ? `+${digits}` : '+55';
  if (digits.startsWith('55')) return `+${digits.slice(0, 13)}`;
  return `+55${digits.slice(0, 11)}`;
}

export function CampaignLanding({ campaignId }: CampaignLandingProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [campaign, setCampaign] = useState<PublicCampaignPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [phone, setPhone] = useState('+55');
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [showStores, setShowStores] = useState(true);
  const appOpenAttempted = useRef(false);

  const tryOpenApp = useCallback(() => {
    if (appOpenAttempted.current) return;
    appOpenAttempted.current = true;

    const deepLink = buildCampaignAppDeepLink(campaignId);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isIOS || isAndroid) {
      const start = Date.now();
      window.location.href = deepLink;

      setTimeout(() => {
        if (Date.now() - start < 2500) {
          setShowStores(true);
        }
      }, 1500);
    }
  }, [campaignId]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setError('Serviço temporariamente indisponível. Tente novamente mais tarde.');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const fn = httpsCallable(functions, 'getPublicCampaign');
        const res = await fn({ campaignId });
        setCampaign(res.data as PublicCampaignPreview);
        tryOpenApp();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Campanha não encontrada');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [campaignId, tryOpenApp]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaiming(true);
    setClaimMessage(null);

    try {
      const fn = httpsCallable(functions, 'redeemCouponCode');
      const res = await fn({ code: couponCode.trim(), campaignId, phone });
      const data = res.data as { message: string };
      setClaimMessage(data.message);
      setClaimSuccess(true);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Não foi possível resgatar o cupom';
      setClaimMessage(message);
      setClaimSuccess(false);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#e94560] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white mt-4">Carregando campanha...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center px-6">
        <p className="text-white text-center">{error ?? 'Campanha não encontrada'}</p>
      </div>
    );
  }

  if (!campaign.isActive) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-4xl mb-4">⏳</p>
          <h1 className="text-white text-xl font-bold">{campaign.name}</h1>
          <p className="text-gray-400 mt-2">Esta campanha não está ativa no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="relative flex-1 flex items-center justify-center bg-black">
        {campaign.videoUrl ? (
          <video
            ref={videoRef}
            src={campaign.videoUrl}
            className="w-full max-h-[calc(100vh-280px)] object-contain"
            autoPlay
            playsInline
            controls
            poster={campaign.bannerUrl}
          />
        ) : (
          <div className="text-center px-6">
            {campaign.bannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.bannerUrl}
                alt={campaign.name}
                className="max-w-full max-h-64 mx-auto rounded-lg mb-4"
              />
            )}
            <p className="text-gray-400">Vídeo em processamento...</p>
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <h1 className="text-white font-bold text-lg">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-gray-300 text-sm mt-1 line-clamp-2">{campaign.description}</p>
          )}
        </div>
      </div>

      <div className="bg-[#16213e] border-t border-[#0f3460] p-4 space-y-4 safe-area-bottom">
        {showStores && (
          <div className="bg-[#1a1a2e] rounded-xl p-4">
            <p className="text-white font-semibold text-sm mb-3">
              Baixe o app {campaign.appName} para mais prêmios
            </p>
            <div className="flex gap-3">
              <a
                href={campaign.playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#0f3460] hover:bg-[#1a4a7a] text-white py-3 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                <span>▶</span> Google Play
              </a>
              <a
                href={campaign.appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#0f3460] hover:bg-[#1a4a7a] text-white py-3 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                <span>🍎</span> App Store
              </a>
            </div>
            <button
              type="button"
              onClick={() => tryOpenApp()}
              className="w-full mt-3 text-[#e94560] text-sm text-center hover:underline"
            >
              Já tenho o app — abrir
            </button>
          </div>
        )}

        <form onSubmit={handleClaim} className="space-y-3">
          <p className="text-white font-semibold text-sm">Resgatar cupom e concorrer</p>
          <input
            type="text"
            placeholder="Código do cupom"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="w-full h-11 px-4 rounded-lg bg-[#1a1a2e] border border-[#0f3460] text-white placeholder:text-gray-500 focus:outline-none focus:border-[#e94560]"
            required
            disabled={claimSuccess}
          />
          <input
            type="tel"
            placeholder="WhatsApp (+55...)"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            className="w-full h-11 px-4 rounded-lg bg-[#1a1a2e] border border-[#0f3460] text-white placeholder:text-gray-500 focus:outline-none focus:border-[#e94560]"
            required
            disabled={claimSuccess}
          />
          <button
            type="submit"
            disabled={claiming || claimSuccess}
            className="w-full h-12 bg-[#e94560] hover:bg-[#c73e54] disabled:opacity-60 text-white font-bold rounded-lg transition-colors"
          >
            {claiming ? 'Validando...' : claimSuccess ? 'Cupom resgatado ✓' : 'Resgatar cupom'}
          </button>
          {claimMessage && (
            <p
              className={`text-sm text-center ${claimSuccess ? 'text-green-400' : 'text-red-400'}`}
            >
              {claimMessage}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
