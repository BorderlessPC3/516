import type { IPushNotificationService } from '@herois/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { authService } from '@/services/firebase/auth.service';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class PushNotificationService implements IPushNotificationService {
  async requestPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async registerToken(token: string): Promise<void> {
    await authService.registerFcmToken(token);
  }

  async unregisterToken(token: string): Promise<void> {
    const uid = (await authService.getCurrentUser())?.id;
    if (!uid) return;
    await authService.updateUserProfile(uid, {
      fcmTokens: [],
    });
  }

  async getExpoPushToken(): Promise<string | null> {
    const granted = await this.requestPermission();
    if (!granted) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });

    return tokenData.data;
  }

  async setupAndroidChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Heróis dos Prêmios',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  }
}

export const pushNotificationService = new PushNotificationService();
