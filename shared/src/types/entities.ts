import {
  AdminRole,
  AuditAction,
  BannerScope,
  CampaignDisplayMode,
  CampaignScope,
  CampaignStatus,
  CoinTransactionType,
  CouponStatus,
  DrawStatus,
  NotificationAudience,
  NotificationStatus,
  NotificationType,
  PrizeType,
  PushEventType,
  QrCodeStatus,
  ScanRejectReason,
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

/** Localização geográfica */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  updatedAt?: FirestoreTimestamp | Date | string;
}

/** Usuário do aplicativo mobile */
export interface User extends BaseEntity {
  name: string;
  phone: string;
  birthDate: string;
  cityId: string;
  cityName: string;
  state: string;
  location?: GeoLocation;
  deviceId?: string;
  fcmTokens: string[];
  coinBalance: number;
  isActive: boolean;
  lastLoginAt?: FirestoreTimestamp | Date | string;
  completedCampaignIds: string[];
  videosWatched: number;
  couponIds: string[];
  drawIds: string[];
  referralCode?: string;
  referredBy?: string;
  scratchCardClaimed?: boolean;
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
  videoIds?: string[];
  displayMode?: CampaignDisplayMode;
  sponsorIds?: string[];
  viewCount: number;
  conversionCount: number;
  createdBy: string;
}

/** Patrocinador */
export interface Sponsor extends BaseEntity {
  name: string;
  description?: string;
  logoUrl?: string;
  videoId?: string;
  prizeId?: string;
  prizeName?: string;
  socialLinks: Partial<Record<SocialNetwork, string>>;
  isActive: boolean;
  createdBy: string;
}

/** Vínculo campanha-patrocinador (ordem da sequência) */
export interface CampaignSponsor extends BaseEntity {
  campaignId: string;
  sponsorId: string;
  sponsorName?: string;
  sequenceOrder: number;
}

/** Banner publicitário rotativo */
export interface Banner extends BaseEntity {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  linkCampaignId?: string;
  scope: BannerScope;
  cityId?: string;
  state?: string;
  sponsorId?: string;
  rotationSeconds: number;
  sequenceOrder: number;
  isActive: boolean;
  createdBy: string;
}

/** Prêmio configurável da raspadinha */
export interface ScratchCardPrize {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  weight: number;
}

/** Configuração da raspadinha */
export interface ScratchCardSettings {
  prizes: ScratchCardPrize[];
  isActive: boolean;
}

/** Recompensa resgatável com moedas */
export interface CoinRewardCatalogItem {
  id: string;
  name: string;
  description?: string;
  coinCost: number;
  isActive: boolean;
}

/** Registro de raspadinha resgatada */
export interface ScratchCardClaim extends BaseEntity {
  userId: string;
  prizeId: string;
  prizeName: string;
  prizeDescription?: string;
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
  sequenceOrder?: number;
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
  prizeId?: string;
  prizeName?: string;
  status: CouponStatus;
  validFrom: FirestoreTimestamp | Date | string;
  validUntil: FirestoreTimestamp | Date | string;
  usedAt?: FirestoreTimestamp | Date | string;
  qrPayload?: string;
  rules?: string;
  isActive: boolean;
  createdBy: string;
}

/** Template de cupom (painel) */
export interface CouponTemplate extends BaseEntity {
  name: string;
  campaignId: string;
  campaignName?: string;
  prizeId?: string;
  prizeName?: string;
  quantity: number;
  quantityUsed: number;
  validFrom: FirestoreTimestamp | Date | string;
  validUntil: FirestoreTimestamp | Date | string;
  rules: string;
  isActive: boolean;
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
  winnerCount: number;
  winnerUserIds?: string[];
  winnerNames?: string[];
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
  campaignBonus?: number;
  referralBonus?: number;
  socialActionBonus?: number;
  multipliers?: Record<string, number>;
  promotions?: Array<{
    name: string;
    multiplier: number;
    startDate: string;
    endDate: string;
  }>;
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
  cancelledAt?: FirestoreTimestamp | Date | string;
  sentCount?: number;
  failedCount?: number;
  targetState?: string;
  pushEvent?: PushEventType;
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
  sponsorId?: string;
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
  isValid?: boolean;
  rejectReason?: ScanRejectReason;
}

/** Registro de leitura QR */
export interface QrScan extends BaseEntity {
  userId: string;
  campaignId: string;
  sponsorId?: string;
  qrPayload: string;
  scannerType: ScannerType;
  deviceId?: string;
  location?: GeoLocation;
  scannedAt: FirestoreTimestamp | Date | string;
}

/** Participação em campanha */
export interface CampaignParticipation extends BaseEntity {
  userId: string;
  campaignId: string;
  startedAt: FirestoreTimestamp | Date | string;
  completedAt?: FirestoreTimestamp | Date | string;
  videosCompleted: number;
  totalVideos: number;
  coinsEarned: number;
  couponId?: string;
  isCompleted: boolean;
  currentStepIndex?: number;
  completedSponsorIds?: string[];
}

/** Participante de sorteio */
export interface DrawParticipant extends BaseEntity {
  drawId: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  coinsSpent?: number;
  isWinner: boolean;
  participatedAt: FirestoreTimestamp | Date | string;
}

/** QR Code de campanha */
export interface CampaignQrCode extends BaseEntity {
  campaignId: string;
  sponsorId?: string;
  payload: string;
  status: QrCodeStatus;
  expiresAt?: FirestoreTimestamp | Date | string;
  maxScans?: number;
  scanCount: number;
  createdBy: string;
}

/** Evento de analytics */
export interface AnalyticsEvent extends BaseEntity {
  type: string;
  userId?: string;
  campaignId?: string;
  videoId?: string;
  metadata?: Record<string, unknown>;
}

/** KPIs do dashboard */
export interface DashboardKPIs {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalDraws: number;
  openDraws: number;
  totalViews: number;
  totalConversions: number;
  conversionRate: number;
  totalCoins: number;
  totalQrScans: number;
  avgWatchTimeSeconds: number;
  completionRate: number;
  pushSent: number;
}

/** Filtros do dashboard */
export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  cityId?: string;
  state?: string;
  campaignId?: string;
  userId?: string;
}

/** Dados de gráfico mensal */
export interface ChartDataPoint {
  name: string;
  views: number;
  conversions: number;
  qrScans: number;
  coins: number;
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
