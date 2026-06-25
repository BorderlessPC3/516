import {
  AdminRole,
  AuditAction,
  CampaignScope,
  CampaignStatus,
  CoinTransactionType,
  CouponStatus,
  DrawStatus,
  NotificationAudience,
  NotificationStatus,
  NotificationType,
  PrizeType,
  ScannerType,
  SocialNetwork,
  VideoProcessingStatus,
  VideoScope,
} from '../constants/enums';

/** Timestamp Firestore serializado */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

/** Entidade base com metadados */
export interface BaseEntity {
  id: string;
  createdAt: FirestoreTimestamp | Date | string;
  updatedAt: FirestoreTimestamp | Date | string;
}

/** Usuário do aplicativo mobile */
export interface User extends BaseEntity {
  name: string;
  phone: string;
  birthDate: string;
  cityId: string;
  cityName: string;
  state: string;
  fcmTokens: string[];
  coinBalance: number;
  isActive: boolean;
  lastLoginAt?: FirestoreTimestamp | Date | string;
  permissionsGranted: {
    camera: boolean;
    location: boolean;
    notifications: boolean;
  };
}

/** Administrador do painel web */
export interface Admin extends BaseEntity {
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: FirestoreTimestamp | Date | string;
  createdBy?: string;
}

/** Cidade */
export interface City extends BaseEntity {
  name: string;
  state: string;
  ibgeCode?: string;
  isActive: boolean;
}

/** Campanha promocional */
export interface Campaign extends BaseEntity {
  name: string;
  description?: string;
  bannerUrl: string;
  bannerImageId?: string;
  videoId?: string;
  videoUrl?: string;
  cityId?: string;
  cityName?: string;
  state?: string;
  scope: CampaignScope;
  status: CampaignStatus;
  startDate: FirestoreTimestamp | Date | string;
  endDate: FirestoreTimestamp | Date | string;
  requiredSocialNetworks: SocialNetwork[];
  coinReward: number;
  sequenceOrder?: number;
  viewCount: number;
  conversionCount: number;
  createdBy: string;
}

/** Vídeo de campanha (pipeline S3/CloudFront) */
export interface CampaignVideo extends BaseEntity {
  campaignId?: string;
  title: string;
  originalFileName: string;
  originalUrl?: string;
  processedUrl?: string;
  cloudFrontUrl?: string;
  s3Key?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  scope: VideoScope;
  processingStatus: VideoProcessingStatus;
  processingError?: string;
  subtitlesUrl?: string;
  subtitlesVtt?: string;
  uploadedBy: string;
}

/** Imagem de campanha */
export interface CampaignImage extends BaseEntity {
  campaignId?: string;
  title: string;
  originalFileName: string;
  url: string;
  storagePath: string;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  uploadedBy: string;
}

/** Cupom promocional */
export interface Coupon extends BaseEntity {
  code: string;
  campaignId: string;
  campaignName?: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  status: CouponStatus;
  validFrom: FirestoreTimestamp | Date | string;
  validUntil: FirestoreTimestamp | Date | string;
  usedAt?: FirestoreTimestamp | Date | string;
  createdBy: string;
}

/** Sorteio */
export interface Draw extends BaseEntity {
  name: string;
  description?: string;
  prizeId: string;
  prizeName?: string;
  prizeType?: PrizeType;
  campaignId?: string;
  status: DrawStatus;
  drawDate: FirestoreTimestamp | Date | string;
  endDate: FirestoreTimestamp | Date | string;
  rules: string;
  minCoinsRequired?: number;
  winnerUserId?: string;
  winnerName?: string;
  participantCount: number;
  createdBy: string;
}

/** Prêmio */
export interface Prize extends BaseEntity {
  name: string;
  description?: string;
  type: PrizeType;
  imageUrl?: string;
  estimatedValue?: number;
  quantity: number;
  isActive: boolean;
  createdBy: string;
}

/** Configuração de moedas (settings) */
export interface CoinSettings {
  rewardAmount: number;
  requiredForReward: number;
  expirationDays?: number;
}

/** Transação de moedas */
export interface CoinTransaction extends BaseEntity {
  userId: string;
  type: CoinTransactionType;
  amount: number;
  balanceAfter: number;
  campaignId?: string;
  drawId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/** Saldo de moedas do usuário (denormalizado) */
export interface CoinWallet extends BaseEntity {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

/** Notificação push */
export interface Notification extends BaseEntity {
  title: string;
  body: string;
  type: NotificationType;
  audience: NotificationAudience;
  status: NotificationStatus;
  targetCityId?: string;
  targetCampaignId?: string;
  targetUserId?: string;
  data?: Record<string, string>;
  scheduledAt?: FirestoreTimestamp | Date | string;
  sentAt?: FirestoreTimestamp | Date | string;
  sentCount?: number;
  failedCount?: number;
  createdBy: string;
}

/** Progresso de visualização de vídeo */
export interface VideoProgress extends BaseEntity {
  userId: string;
  campaignId: string;
  videoId: string;
  currentTimeSeconds: number;
  durationSeconds: number;
  watchedPercent: number;
  isCompleted: boolean;
  completedAt?: FirestoreTimestamp | Date | string;
  lastWatchedAt: FirestoreTimestamp | Date | string;
}

/** Visualização concluída de vídeo */
export interface VideoView extends BaseEntity {
  userId: string;
  campaignId: string;
  videoId: string;
  watchedSeconds: number;
  watchedPercent: number;
  completedAt: FirestoreTimestamp | Date | string;
}

/** Ação de rede social confirmada */
export interface SocialAction extends BaseEntity {
  userId: string;
  campaignId: string;
  network: SocialNetwork;
  confirmed: boolean;
  confirmedAt?: FirestoreTimestamp | Date | string;
  metadata?: Record<string, unknown>;
}

/** Log de auditoria administrativa */
export interface AuditLog extends BaseEntity {
  adminId: string;
  adminEmail: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/** Configurações globais */
export interface AppSettings extends BaseEntity {
  key: string;
  value: unknown;
  updatedBy: string;
}

/** Resultado de scan (desacoplado para Vuforia/IA) */
export interface ScanResult {
  type: ScannerType;
  payload: string;
  campaignId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/** KPIs do dashboard */
export interface DashboardKPIs {
  totalUsers: number;
  activeUsers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalCoupons: number;
  activeCoupons: number;
  totalDraws: number;
  openDraws: number;
  totalViews: number;
  totalConversions: number;
  conversionRate: number;
}

/** Paginação */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Resposta API padrão */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Filtros de listagem */
export interface ListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Sessão do usuário mobile */
export interface UserSession {
  uid: string;
  phone: string;
  user: User;
  token: string;
}

/** Sessão do administrador */
export interface AdminSession {
  uid: string;
  email: string;
  admin: Admin;
  permissions: string[];
  token: string;
}
