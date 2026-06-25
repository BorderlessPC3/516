import { ScannerType, APP_SCHEME, APP_UNIVERSAL_LINK_DOMAIN } from '@herois/shared';
import type { ScanResult } from '@herois/shared';
import type { IScannerService } from '@herois/shared';
import { CameraView } from 'expo-camera';
import * as Linking from 'expo-linking';

/**
 * ScannerService - Interface desacoplada para múltiplos tipos de scan.
 * Preparado para extensão com Vuforia (VISUAL_RECOGNITION) e IA.
 */
class ScannerService implements IScannerService {
  async scanQRCode(): Promise<ScanResult> {
    return {
      type: ScannerType.QR_CODE,
      payload: '',
      timestamp: new Date(),
    };
  }

  parseQRCodePayload(data: string): ScanResult {
    let campaignId: string | undefined;

    if (data.includes('campaignId=')) {
      const url = new URL(data.replace(`${APP_SCHEME}://`, 'https://x/'));
      campaignId = url.searchParams.get('campaignId') ?? undefined;
    } else if (data.startsWith('HP:')) {
      campaignId = data.replace('HP:', '');
    }

    return {
      type: ScannerType.QR_CODE,
      payload: data,
      campaignId,
      timestamp: new Date(),
    };
  }

  async handleDeepLink(url: string): Promise<ScanResult | null> {
    if (!url.startsWith(`${APP_SCHEME}://`)) return null;

    const parsed = Linking.parse(url);
    const campaignId = parsed.queryParams?.campaignId as string | undefined;

    return {
      type: ScannerType.DEEP_LINK,
      payload: url,
      campaignId,
      metadata: parsed.queryParams as Record<string, unknown>,
      timestamp: new Date(),
    };
  }

  async handleUniversalLink(url: string): Promise<ScanResult | null> {
    if (!url.includes(APP_UNIVERSAL_LINK_DOMAIN)) return null;

    const parsed = Linking.parse(url);
    const campaignId = parsed.queryParams?.campaignId as string | undefined;

    return {
      type: ScannerType.UNIVERSAL_LINK,
      payload: url,
      campaignId,
      metadata: parsed.queryParams as Record<string, unknown>,
      timestamp: new Date(),
    };
  }

  /** Reservado para integração Vuforia - Image Targets / Model Targets */
  async scanVisualRecognition(): Promise<ScanResult> {
    throw new Error('Reconhecimento visual não implementado. Integrar Vuforia Engine SDK.');
  }

  isSupported(type: string): boolean {
    const supported = [ScannerType.QR_CODE, ScannerType.DEEP_LINK, ScannerType.UNIVERSAL_LINK];
    return supported.includes(type as ScannerType);
  }
}

export const scannerService = new ScannerService();

/** Componente reutilizável para scan QR */
export { CameraView };
