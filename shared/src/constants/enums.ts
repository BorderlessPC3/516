/** Roles administrativos com hierarquia RBAC */
export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPERADOR = 'OPERADOR',
}

/** Escopo geográfico da campanha */
export enum CampaignScope {
  NATIONAL = 'NATIONAL',
  REGIONAL = 'REGIONAL',
  MUNICIPAL = 'MUNICIPAL',
}

/** Modo de exibição da campanha */
export enum CampaignDisplayMode {
  EXPANDED = 'EXPANDED',
  AR = 'AR',
}

/** Escopo geográfico de banners */
export enum BannerScope {
  NATIONAL = 'NATIONAL',
  REGIONAL = 'REGIONAL',
  MUNICIPAL = 'MUNICIPAL',
  SPONSOR = 'SPONSOR',
}

/** Status operacional da campanha */
export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
  ARCHIVED = 'ARCHIVED',
}

/** Status do pipeline de processamento de vídeo */
export enum VideoProcessingStatus {
  PENDING_UPLOAD = 'PENDING_UPLOAD',
  UPLOADING = 'UPLOADING',
  COMPRESSING = 'COMPRESSING',
  TRANSCRIBING = 'TRANSCRIBING',
  UPLOADING_S3 = 'UPLOADING_S3',
  READY = 'READY',
  FAILED = 'FAILED',
}

/** Escopo de distribuição do vídeo */
export enum VideoScope {
  LOCAL = 'LOCAL',
  NATIONAL = 'NATIONAL',
}

/** Redes sociais suportadas nas campanhas */
export enum SocialNetwork {
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  TIKTOK = 'TIKTOK',
  WHATSAPP = 'WHATSAPP',
}

/** Status do cupom */
export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/** Status do sorteio */
export enum DrawStatus {
  SCHEDULED = 'SCHEDULED',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  DRAWN = 'DRAWN',
  CANCELLED = 'CANCELLED',
}

/** Tipos de prêmio */
export enum PrizeType {
  AIR_FRYER = 'AIR_FRYER',
  FUEL = 'FUEL',
  GIFT_CARD = 'GIFT_CARD',
  OTHER = 'OTHER',
}

/** Tipos de transação de moedas */
export enum CoinTransactionType {
  EARNED = 'EARNED',
  SPENT = 'SPENT',
  BONUS = 'BONUS',
  EXPIRED = 'EXPIRED',
  ADJUSTMENT = 'ADJUSTMENT',
}

/** Tipos de notificação push */
export enum NotificationType {
  CAMPAIGN = 'CAMPAIGN',
  REMINDER = 'REMINDER',
  DRAW = 'DRAW',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM',
}

/** Público-alvo da notificação */
export enum NotificationAudience {
  ALL = 'ALL',
  CITY = 'CITY',
  STATE = 'STATE',
  CAMPAIGN = 'CAMPAIGN',
  USER = 'USER',
  ACTIVE_USERS = 'ACTIVE_USERS',
  INACTIVE_USERS = 'INACTIVE_USERS',
  NO_VIDEOS = 'NO_VIDEOS',
  NO_COINS = 'NO_COINS',
  NO_COUPONS = 'NO_COUPONS',
}

/** Eventos automáticos de push */
export enum PushEventType {
  NEW_VIDEO = 'NEW_VIDEO',
  NEW_PRIZE = 'NEW_PRIZE',
  NEW_COUPON = 'NEW_COUPON',
  CAMPAIGN_STARTED = 'CAMPAIGN_STARTED',
  CAMPAIGN_ENDING = 'CAMPAIGN_ENDING',
  DRAW_UPCOMING = 'DRAW_UPCOMING',
  PRIZE_WON = 'PRIZE_WON',
  VIDEOS_REMAINING = 'VIDEOS_REMAINING',
  COUPON_EXPIRING = 'COUPON_EXPIRING',
}

/** Status do QR Code de campanha */
export enum QrCodeStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  DISABLED = 'DISABLED',
}

/** Motivo de rejeição de scan */
export enum ScanRejectReason {
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED',
  DUPLICATE = 'DUPLICATE',
  CAMPAIGN_INACTIVE = 'CAMPAIGN_INACTIVE',
  CAMPAIGN_ENDED = 'CAMPAIGN_ENDED',
}

/** Status da notificação */
export enum NotificationStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

/** Tipo de ação de auditoria */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

/** Tipo de scanner (extensível para Vuforia/IA) */
export enum ScannerType {
  QR_CODE = 'QR_CODE',
  DEEP_LINK = 'DEEP_LINK',
  UNIVERSAL_LINK = 'UNIVERSAL_LINK',
  VISUAL_RECOGNITION = 'VISUAL_RECOGNITION',
}

/** Permissões RBAC granulares */
export enum Permission {
  DASHBOARD_VIEW = 'dashboard:view',
  CAMPAIGNS_READ = 'campaigns:read',
  CAMPAIGNS_WRITE = 'campaigns:write',
  CAMPAIGNS_DELETE = 'campaigns:delete',
  VIDEOS_READ = 'videos:read',
  VIDEOS_WRITE = 'videos:write',
  IMAGES_READ = 'images:read',
  IMAGES_WRITE = 'images:write',
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  COUPONS_READ = 'coupons:read',
  COUPONS_WRITE = 'coupons:write',
  COUPONS_DELETE = 'coupons:delete',
  DRAWS_READ = 'draws:read',
  DRAWS_WRITE = 'draws:write',
  DRAWS_DELETE = 'draws:delete',
  PRIZES_READ = 'prizes:read',
  PRIZES_WRITE = 'prizes:write',
  COINS_READ = 'coins:read',
  COINS_WRITE = 'coins:write',
  NOTIFICATIONS_READ = 'notifications:read',
  NOTIFICATIONS_WRITE = 'notifications:write',
  ADMINS_READ = 'admins:read',
  ADMINS_WRITE = 'admins:write',
  AUDIT_READ = 'audit:read',
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',
  SPONSORS_READ = 'sponsors:read',
  SPONSORS_WRITE = 'sponsors:write',
  BANNERS_READ = 'banners:read',
  BANNERS_WRITE = 'banners:write',
}
