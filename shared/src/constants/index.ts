export * from './enums';

import { AdminRole, Permission } from './enums';

/** Mapeamento RBAC: role → permissões */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  [AdminRole.SUPER_ADMIN]: Object.values(Permission),
  [AdminRole.ADMIN]: [
    Permission.DASHBOARD_VIEW,
    Permission.CAMPAIGNS_READ,
    Permission.CAMPAIGNS_WRITE,
    Permission.CAMPAIGNS_DELETE,
    Permission.VIDEOS_READ,
    Permission.VIDEOS_WRITE,
    Permission.IMAGES_READ,
    Permission.IMAGES_WRITE,
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.COUPONS_READ,
    Permission.COUPONS_WRITE,
    Permission.COUPONS_DELETE,
    Permission.DRAWS_READ,
    Permission.DRAWS_WRITE,
    Permission.DRAWS_DELETE,
    Permission.PRIZES_READ,
    Permission.PRIZES_WRITE,
    Permission.COINS_READ,
    Permission.COINS_WRITE,
    Permission.NOTIFICATIONS_READ,
    Permission.NOTIFICATIONS_WRITE,
    Permission.AUDIT_READ,
    Permission.SETTINGS_READ,
  ],
  [AdminRole.OPERADOR]: [
    Permission.DASHBOARD_VIEW,
    Permission.CAMPAIGNS_READ,
    Permission.VIDEOS_READ,
    Permission.IMAGES_READ,
    Permission.USERS_READ,
    Permission.COUPONS_READ,
    Permission.DRAWS_READ,
    Permission.PRIZES_READ,
    Permission.COINS_READ,
    Permission.NOTIFICATIONS_READ,
    Permission.NOTIFICATIONS_WRITE,
  ],
};

/** Hierarquia de roles (maior número = mais privilégios) */
export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  [AdminRole.OPERADOR]: 1,
  [AdminRole.ADMIN]: 2,
  [AdminRole.SUPER_ADMIN]: 3,
};

/** Collections Firestore */
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  CAMPAIGNS: 'campaigns',
  CAMPAIGN_VIDEOS: 'campaignVideos',
  CAMPAIGN_IMAGES: 'campaignImages',
  COUPONS: 'coupons',
  COUPON_TEMPLATES: 'couponTemplates',
  DRAWS: 'draws',
  DRAW_PARTICIPANTS: 'drawParticipants',
  PRIZES: 'prizes',
  COINS: 'coins',
  COIN_TRANSACTIONS: 'coinTransactions',
  NOTIFICATIONS: 'notifications',
  VIDEO_PROGRESS: 'videoProgress',
  SOCIAL_ACTIONS: 'socialActions',
  CITIES: 'cities',
  SETTINGS: 'settings',
  ADMINS: 'admins',
  AUDIT_LOGS: 'auditLogs',
  VIDEO_VIEWS: 'videoViews',
  QR_SCANS: 'qrScans',
  CAMPAIGN_PARTICIPATIONS: 'campaignParticipations',
  CAMPAIGN_QR_CODES: 'campaignQrCodes',
  ANALYTICS_EVENTS: 'analyticsEvents',
} as const;

/** Percentual mínimo para considerar vídeo concluído */
export const VIDEO_COMPLETION_THRESHOLD = 0.9;

/** Velocidades de reprodução disponíveis */
export const VIDEO_PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** Paginação padrão */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Rate limiting */
export const RATE_LIMIT = {
  MAX_REQUESTS: 100,
  WINDOW_MS: 60_000,
} as const;

/** Regex para telefone brasileiro (WhatsApp) */
export const PHONE_REGEX = /^\+55\d{10,11}$/;

/** Deep link scheme do app */
export const APP_SCHEME = 'heroisdospremios';
export const APP_UNIVERSAL_LINK_DOMAIN = 'heroisdospremios.com.br';

/** Chaves de configuração em settings */
export const SETTINGS_KEYS = {
  COIN_REWARD_AMOUNT: 'coinRewardAmount',
  COIN_REQUIRED_FOR_REWARD: 'coinRequiredForReward',
  VIDEO_COMPLETION_THRESHOLD: 'videoCompletionThreshold',
  MAINTENANCE_MODE: 'maintenanceMode',
  COIN_SETTINGS: 'coinSettings',
} as const;

/** Dias de inatividade para considerar usuário inativo */
export const INACTIVE_USER_DAYS = 30;

/** Máximo de tokens FCM por envio */
export const FCM_BATCH_SIZE = 500;

/** Prefixo QR Code legado */
export const QR_LEGACY_PREFIX = 'HP:';
