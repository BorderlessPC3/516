import { ScannerType, parseUniversalLinkCampaignId, withRetry } from '@herois/shared';
import type { ScanResult } from '@herois/shared';
import type { IScannerService } from '@herois/shared';
import { parseQrCampaignId } from '@herois/shared';
import * as Linking from 'expo-linking';
import { httpsCallable } from 'firebase/functions';

import { firebaseFunctions } from '@/services/firebase/firebase-client';

class ScannerService implements IScannerService {
  async scanQRCode(): Promise<ScanResult> {
    return {
      type: ScannerType.QR_CODE,
      payload: '',
      timestamp: new Date(),
    };
  }

  parseQRCodePayload(data: string): ScanResult {
    const campaignId = parseQrCampaignId(data);
    return {
      type: ScannerType.QR_CODE,
      payload: data,
      campaignId,
      timestamp: new Date(),
    };
  }

  async validateAndRegisterScan(
    payload: string,
    options?: { location?: { latitude: number; longitude: number }; deviceId?: string },
  ): Promise<ScanResult> {
    const validateQrScan = httpsCallable(firebaseFunctions, 'validateQrScan');

    const result = await withRetry(async () => {
      const response = await validateQrScan({
        payload,
        location: options?.location,
        deviceId: options?.deviceId,
      });
      return response.data as {
        isValid: boolean;
        campaignId?: string;
        sponsorId?: string;
        startStepIndex?: number;
        rejectReason?: string;
        message?: string;
      };
    });

    return {
      type: ScannerType.QR_CODE,
      payload,
      campaignId: result.campaignId,
      isValid: result.isValid,
      rejectReason: result.rejectReason as ScanResult['rejectReason'],
      metadata: {
        message: result.message,
        sponsorId: result.sponsorId,
        startStepIndex: result.startStepIndex,
      },
      timestamp: new Date(),
    };
  }

  async handleDeepLink(url: string): Promise<ScanResult | null> {
    const campaignId = parseUniversalLinkCampaignId(url);
    if (campaignId) {
      return this.validateAndRegisterScan(url, {});
    }

    const parsed = Linking.parse(url);
    const queryCampaignId = parsed.queryParams?.campaignId as string | undefined;
    if (!queryCampaignId) return null;

    return this.validateAndRegisterScan(url, {});
  }

  async handleUniversalLink(url: string): Promise<ScanResult | null> {
    return this.handleDeepLink(url);
  }

  async scanVisualRecognition(): Promise<ScanResult> {
    throw new Error('Reconhecimento visual não implementado. Integrar Vuforia Engine SDK.');
  }

  isSupported(type: string): boolean {
    const supported = [ScannerType.QR_CODE, ScannerType.DEEP_LINK, ScannerType.UNIVERSAL_LINK];
    return supported.includes(type as ScannerType);
  }
}

export const scannerService = new ScannerService();
