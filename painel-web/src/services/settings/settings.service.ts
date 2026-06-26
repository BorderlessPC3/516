import {
  APP_UNIVERSAL_LINK_DOMAIN,
  FIRESTORE_COLLECTIONS,
  SETTINGS_KEYS,
  VIDEO_COMPLETION_THRESHOLD,
  type CoinSettings,
} from '@herois/shared';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { withFirestore } from '@/lib/firestore-guard';
import { db, isFirebaseConfigured } from '@/services/firebase/client';

const LOCAL_STORAGE_KEY = 'painel_app_settings';

export interface AppSettingsForm {
  appName: string;
  supportEmail: string;
  supportPhone: string;
  deepLinkDomain: string;
  maintenanceMode: boolean;
  coinRewardAmount: number;
  coinRequiredForReward: number;
  videoCompletionThreshold: number;
  coinSettings: CoinSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettingsForm = {
  appName: 'Heróis dos Prêmios',
  supportEmail: '',
  supportPhone: '',
  deepLinkDomain: APP_UNIVERSAL_LINK_DOMAIN,
  maintenanceMode: false,
  coinRewardAmount: 1,
  coinRequiredForReward: 10,
  videoCompletionThreshold: VIDEO_COMPLETION_THRESHOLD,
  coinSettings: {
    rewardAmount: 1,
    requiredForReward: 10,
    expirationDays: 365,
    campaignBonus: 0,
    referralBonus: 5,
    socialActionBonus: 1,
  },
};

function readLocalSettings(): AppSettingsForm {
  if (typeof window === 'undefined') return DEFAULT_APP_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

function writeLocalSettings(settings: AppSettingsForm): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
}

async function readFirestoreSettings(): Promise<Partial<AppSettingsForm>> {
  const keys = [
    SETTINGS_KEYS.COIN_REWARD_AMOUNT,
    SETTINGS_KEYS.COIN_REQUIRED_FOR_REWARD,
    SETTINGS_KEYS.VIDEO_COMPLETION_THRESHOLD,
    SETTINGS_KEYS.MAINTENANCE_MODE,
    SETTINGS_KEYS.COIN_SETTINGS,
    'appName',
    'supportEmail',
    'supportPhone',
    'deepLinkDomain',
  ];

  const partial: Partial<AppSettingsForm> = {};

  for (const key of keys) {
    const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, key));
    if (!snap.exists()) continue;
    const data = snap.data();
    const value = data.value ?? data;

    switch (key) {
      case SETTINGS_KEYS.COIN_REWARD_AMOUNT:
        partial.coinRewardAmount = Number(value);
        break;
      case SETTINGS_KEYS.COIN_REQUIRED_FOR_REWARD:
        partial.coinRequiredForReward = Number(value);
        break;
      case SETTINGS_KEYS.VIDEO_COMPLETION_THRESHOLD:
        partial.videoCompletionThreshold = Number(value);
        break;
      case SETTINGS_KEYS.MAINTENANCE_MODE:
        partial.maintenanceMode = Boolean(value);
        break;
      case SETTINGS_KEYS.COIN_SETTINGS:
        partial.coinSettings = value as CoinSettings;
        break;
      case 'appName':
        partial.appName = String(value);
        break;
      case 'supportEmail':
        partial.supportEmail = String(value);
        break;
      case 'supportPhone':
        partial.supportPhone = String(value);
        break;
      case 'deepLinkDomain':
        partial.deepLinkDomain = String(value);
        break;
      default:
        break;
    }
  }

  return partial;
}

export async function loadAppSettings(): Promise<{
  settings: AppSettingsForm;
  source: 'firestore' | 'local' | 'default';
}> {
  const local = readLocalSettings();

  if (!isFirebaseConfigured()) {
    return { settings: local, source: local === DEFAULT_APP_SETTINGS ? 'default' : 'local' };
  }

  const remote = await withFirestore(() => readFirestoreSettings(), {});

  if (Object.keys(remote).length === 0) {
    return { settings: local, source: local === DEFAULT_APP_SETTINGS ? 'default' : 'local' };
  }

  return {
    settings: { ...DEFAULT_APP_SETTINGS, ...local, ...remote },
    source: 'firestore',
  };
}

export async function saveAppSettings(
  settings: AppSettingsForm,
  userId: string,
): Promise<{ savedTo: 'firestore' | 'local' }> {
  writeLocalSettings(settings);

  if (!isFirebaseConfigured()) {
    return { savedTo: 'local' };
  }

  const saved = await withFirestore(
    async () => {
      const entries: Array<[string, unknown]> = [
        [SETTINGS_KEYS.COIN_REWARD_AMOUNT, settings.coinRewardAmount],
        [SETTINGS_KEYS.COIN_REQUIRED_FOR_REWARD, settings.coinRequiredForReward],
        [SETTINGS_KEYS.VIDEO_COMPLETION_THRESHOLD, settings.videoCompletionThreshold],
        [SETTINGS_KEYS.MAINTENANCE_MODE, settings.maintenanceMode],
        [SETTINGS_KEYS.COIN_SETTINGS, settings.coinSettings],
        ['appName', settings.appName],
        ['supportEmail', settings.supportEmail],
        ['supportPhone', settings.supportPhone],
        ['deepLinkDomain', settings.deepLinkDomain],
      ];

      await Promise.all(
        entries.map(([key, value]) =>
          setDoc(
            doc(db, FIRESTORE_COLLECTIONS.SETTINGS, key),
            {
              key,
              value,
              updatedBy: userId,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true },
          ),
        ),
      );
      return true;
    },
    false,
  );

  return { savedTo: saved ? 'firestore' : 'local' };
}
