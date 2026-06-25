import { FIRESTORE_COLLECTIONS, normalizePhone } from '@herois/shared';
import type { User } from '@herois/shared';
import type { IAuthService } from '@herois/shared';
import * as SecureStore from 'expo-secure-store';
import {
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { firebaseAuth, firestore } from './firebase-client';

const SESSION_KEY = 'herois_session_token';

class FirebaseAuthService implements IAuthService {
  private confirmationResult: Awaited<ReturnType<typeof signInWithPhoneNumber>> | null = null;

  async sendOtp(phone: string): Promise<void> {
    const normalizedPhone = normalizePhone(phone);
    // Em React Native, usar Firebase Phone Auth nativo via expo-firebase-recaptcha ou @react-native-firebase/auth
    // Para web/dev: RecaptchaVerifier necessário
    // Esta implementação usa o fluxo via confirmationResult após verifyPhoneNumber nativo
    this.confirmationResult = null;
    // Placeholder: integrar com expo-firebase-recaptcha em produção
    console.info(`[Auth] OTP enviado para ${normalizedPhone}`);
  }

  async verifyOtp(phone: string, code: string): Promise<{ uid: string; token: string }> {
    const normalizedPhone = normalizePhone(phone);

    if (this.confirmationResult) {
      const credential = await this.confirmationResult.confirm(code);
      const user = credential.user;
      const token = await user.getIdToken();
      await SecureStore.setItemAsync(SESSION_KEY, token);
      return { uid: user.uid, token };
    }

    // Fallback: credential direto (testes/emulador)
    const credential = PhoneAuthProvider.credential(normalizedPhone, code);
    const result = await signInWithCredential(firebaseAuth, credential);
    const token = await result.user.getIdToken();
    await SecureStore.setItemAsync(SESSION_KEY, token);
    return { uid: result.user.uid, token };
  }

  async signOut(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await firebaseSignOut(firebaseAuth);
  }

  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = firebaseAuth.currentUser;
    if (!firebaseUser) return null;

    const userDoc = await getDoc(doc(firestore, FIRESTORE_COLLECTIONS.USERS, firebaseUser.uid));
    if (!userDoc.exists()) return null;

    return { id: userDoc.id, ...userDoc.data() } as User;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }
      const user = await this.getCurrentUser();
      callback(user);
    });
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
    },
  ): Promise<User> {
    const userData = {
      name: data.name,
      phone: normalizePhone(data.phone),
      birthDate: data.birthDate,
      cityId: data.cityId,
      cityName: data.cityName,
      state: data.state,
      fcmTokens: [],
      coinBalance: 0,
      isActive: true,
      permissionsGranted: {
        camera: false,
        location: false,
        notifications: false,
      },
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
    return SecureStore.getItemAsync(SESSION_KEY);
  }
}

export const authService = new FirebaseAuthService();
