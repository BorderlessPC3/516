import { Permission } from '../constants/enums';
import type { Campaign, PaginatedResult, ScanResult, User } from '../types/entities';

/** Contrato de repositório de usuários */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  list(filters: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResult<User>>;
}

/** Contrato de repositório de campanhas */
export interface ICampaignRepository {
  findById(id: string): Promise<Campaign | null>;
  findActive(filters?: { cityId?: string }): Promise<Campaign[]>;
  list(filters: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<PaginatedResult<Campaign>>;
  create(data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign>;
  update(id: string, data: Partial<Campaign>): Promise<Campaign>;
  delete(id: string): Promise<void>;
}

/** Contrato do serviço de scanner (desacoplado para Vuforia/IA) */
export interface IScannerService {
  scanQRCode(): Promise<ScanResult>;
  parseQRCodePayload(data: string): ScanResult;
  validateAndRegisterScan(
    payload: string,
    options?: { location?: { latitude: number; longitude: number }; deviceId?: string },
  ): Promise<ScanResult>;
  handleDeepLink(url: string): Promise<ScanResult | null>;
  handleUniversalLink(url: string): Promise<ScanResult | null>;
  /** Reservado para integração futura com Vuforia */
  scanVisualRecognition?(): Promise<ScanResult>;
  isSupported(type: string): boolean;
}

/** Contrato de autenticação mobile */
export interface IAuthService {
  sendOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<{ uid: string; token: string }>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
  createUserProfile(
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
  ): Promise<User>;
  updateUserProfile(uid: string, data: Partial<User>): Promise<void>;
  getSessionToken(): Promise<string | null>;
  refreshSession(): Promise<string | null>;
  registerFcmToken(token: string): Promise<void>;
}

/** Contrato de autenticação administrativa */
export interface IAdminAuthService {
  signIn(email: string, password: string): Promise<{ uid: string; token: string }>;
  signOut(): Promise<void>;
  getCurrentAdmin(): Promise<{ uid: string; email: string; role: string } | null>;
  hasPermission(permission: Permission): boolean;
}

/** Contrato de upload de vídeo */
export interface IVideoUploadService {
  initiateUpload(metadata: { title: string; fileName: string; campaignId?: string }): Promise<{
    uploadUrl: string;
    videoId: string;
  }>;
  getProcessingStatus(videoId: string): Promise<{ status: string; url?: string }>;
}

/** Contrato de player de vídeo */
export interface IVideoPlayerService {
  saveProgress(
    campaignId: string,
    videoId: string,
    currentTime: number,
    duration: number,
  ): Promise<void>;
  getProgress(
    campaignId: string,
    videoId: string,
  ): Promise<{ currentTime: number; watchedPercent: number; isCompleted: boolean } | null>;
  markCompleted(
    campaignId: string,
    videoId: string,
    watchedSeconds: number,
    watchedPercent: number,
  ): Promise<{ coinsEarned?: number; campaignCompleted?: boolean; couponId?: string }>;
  getCampaignVideos(campaignId: string): Promise<
    Array<{
      id: string;
      title: string;
      url: string;
      sequenceOrder: number;
      durationSeconds?: number;
    }>
  >;
  trackAnalytics(
    event: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
}

/** Contrato de notificações push */
export interface IPushNotificationService {
  registerToken(token: string): Promise<void>;
  unregisterToken(token: string): Promise<void>;
  requestPermission(): Promise<boolean>;
}

/** Eventos de domínio */
export interface DomainEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export interface IEventBus {
  publish(event: DomainEvent): void;
  subscribe(type: string, handler: (event: DomainEvent) => void): () => void;
}
