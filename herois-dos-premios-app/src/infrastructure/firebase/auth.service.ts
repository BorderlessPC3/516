import {
  FIRESTORE_COLLECTIONS,
  generateReferralCode,
  normalizePhone,
  withRetry,
} from '@herois/shared';
import type { User } from '@herois/shared';
import type { IAuthService } from '@herois/shared';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import {
  PhoneAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPhoneNumber,
  type ApplicationVerifier,
  type User as FirebaseUser,
} from 'firebase/auth';
import { arrayUnion, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { firebaseAuth, firestore } from './firebase-client';

const SESSION_KEY = 'herois_session_token';

class FirebaseAuthService implements IAuthService {
  private confirmationResult: Awaited<ReturnType<typeof signInWithPhoneNumber>> | null = null;
  private recaptchaVerifier: ApplicationVerifier | null = null;

  setRecaptchaVerifier(verifier: ApplicationVerifier | null) {
    this.recaptchaVerifier = verifier;
  }

  async sendOtp(phone: string): Promise<void> {
    const normalizedPhone = normalizePhone(phone);

    if (this.recaptchaVerifier) {
      this.confirmationResult = await withRetry(() =>
        signInWithPhoneNumber(firebaseAuth, normalizedPhone, this.recaptchaVerifier!),
      );
      return;
    }

    if (process.env.EXPO_PUBLIC_USE_AUTH_EMULATOR === 'true') {
      return;
    }

    throw new Error('Verificador reCAPTCHA não configurado. Reinicie o app.');
  }

  async verifyOtp(phone: string, code: string): Promise<{ uid: string; token: string }> {
    const normalizedPhone = normalizePhone(phone);

    let user: FirebaseUser;

    if (this.confirmationResult) {
      const credential = await this.confirmationResult.confirm(code);
      user = credential.user;
    } else {
      const credential = PhoneAuthProvider.credential(normalizedPhone, code);
      const result = await signInWithCredential(firebaseAuth, credential);
      user = result.user;
    }

    const token = await user.getIdToken();
    await SecureStore.setItemAsync(SESSION_KEY, token);

    await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.USERS, user.uid), {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(() => {
      // perfil ainda não criado no registro
    });

    return { uid: user.uid, token };
  }

  async signOut(): Promise<void> {
    const uid = firebaseAuth.currentUser?.uid;
    if (uid) {
      const userDoc = await getDoc(doc(firestore, FIRESTORE_COLLECTIONS.USERS, uid));
      const tokens = (userDoc.data()?.fcmTokens as string[]) ?? [];
      if (tokens.length) {
        await this.unregisterFcmTokens(uid, tokens);
      }
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await firebaseSignOut(firebaseAuth);
    this.confirmationResult = null;
  }

  private async unregisterFcmTokens(uid: string, tokens: string[]) {
    await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.USERS, uid), {
      fcmTokens: tokens.slice(0, 0),
      updatedAt: serverTimestamp(),
    });
  }

  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = firebaseAuth.currentUser;
    if (!firebaseUser) return null;

    const userDoc = await getDoc(doc(firestore, FIRESTORE_COLLECTIONS.USERS, firebaseUser.uid));
    if (!userDoc.exists()) return null;

    return { id: userDoc.id, ...userDoc.data() } as User;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const unsubAuth = onAuthStateChanged(firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }
      const user = await this.getCurrentUser();
      callback(user);
    });

    const unsubToken = onIdTokenChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        await SecureStore.setItemAsync(SESSION_KEY, token);
      }
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }

  async createUserProfile(
    uid: string,
    data: {
      name: string;
      phone: string;
      birthDate: string;
      cityId: string;
      cityName: string;
      state: string;
      deviceId?: string;
      referredBy?: string;
    },
  ): Promise<User> {
    const deviceId = data.deviceId ?? Application.getAndroidId?.() ?? Application.applicationId ?? 'unknown';
    const referralCode = generateReferralCode(data.name);

    const userData = {
      name: data.name,
      phone: normalizePhone(data.phone),
      birthDate: data.birthDate,
      cityId: data.cityId,
      cityName: data.cityName,
      state: data.state,
      deviceId,
      fcmTokens: [],
      coinBalance: 0,
      isActive: true,
      completedCampaignIds: [],
      videosWatched: 0,
      couponIds: [],
      drawIds: [],
      referralCode,
      referredBy: data.referredBy,
      permissionsGranted: {
        camera: false,
        location: false,
        notifications: false,
      },
      lastLoginAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.USERS, uid), userData);
    return {
      id: uid,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as User;
  }

  async updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.USERS, uid), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async getSessionToken(): Promise<string | null> {
    if (firebaseAuth.currentUser) {
      return firebaseAuth.currentUser.getIdToken();
    }
    return SecureStore.getItemAsync(SESSION_KEY);
  }

  async refreshSession(): Promise<string | null> {
    if (!firebaseAuth.currentUser) return null;
    const token = await firebaseAuth.currentUser.getIdToken(true);
    await SecureStore.setItemAsync(SESSION_KEY, token);
    return token;
  }

  async registerFcmToken(token: string): Promise<void> {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid || !token) return;

    await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.USERS, uid), {
      fcmTokens: arrayUnion(token),
      updatedAt: serverTimestamp(),
    });
  }
}

export const authService = new FirebaseAuthService();
