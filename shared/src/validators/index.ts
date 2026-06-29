import { z } from 'zod';

import { PHONE_REGEX } from '../constants';
import {
  AdminRole,
  BannerScope,
  CampaignDisplayMode,
  CampaignScope,
  CampaignStatus,
  DrawStatus,
  NotificationAudience,
  NotificationType,
  PrizeType,
  SocialNetwork,
  VideoScope,
} from '../constants/enums';
import { MAX_PIZZA_COUPONS_PER_PURCHASE } from '../constants';

/** Telefone brasileiro formatado +55XXXXXXXXXXX */
export const phoneSchema = z
  .string()
  .regex(PHONE_REGEX, 'Telefone deve estar no formato +55XXXXXXXXXXX');

/** Data ISO (YYYY-MM-DD) */
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');

/** Cadastro de usuário mobile */
export const userRegistrationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  phone: phoneSchema,
  birthDate: dateSchema,
  cityId: z.string().min(1, 'Cidade é obrigatória'),
});

export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;

/** Atualização de perfil */
export const userProfileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: phoneSchema.optional(),
  cityId: z.string().min(1).optional(),
});

export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;

/** Login por telefone */
export const phoneLoginSchema = z.object({
  phone: phoneSchema,
});

export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;

/** Verificação OTP */
export const otpVerificationSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Código deve ter 6 dígitos'),
});

/** Campanha CRUD */
export const campaignSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  bannerUrl: z.string().url().optional(),
  bannerImageId: z.string().optional(),
  videoId: z.string().optional(),
  cityId: z.string().optional(),
  scope: z.nativeEnum(CampaignScope),
  status: z.nativeEnum(CampaignStatus),
  startDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }),
  requiredSocialNetworks: z.array(z.nativeEnum(SocialNetwork)).default([]),
  coinReward: z.number().int().min(0).default(1),
  sequenceOrder: z.number().int().min(0).optional(),
  displayMode: z.nativeEnum(CampaignDisplayMode).default(CampaignDisplayMode.EXPANDED),
  sponsorIds: z.array(z.string()).optional(),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

/** Cupom CRUD (painel) */
export const couponTemplateSchema = z.object({
  name: z.string().min(2).max(200),
  campaignId: z.string().min(1),
  prizeId: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  validFrom: z.string().datetime({ offset: true }),
  validUntil: z.string().datetime({ offset: true }),
  rules: z.string().min(5).max(5000),
  isActive: z.boolean().default(true),
});

export type CouponTemplateInput = z.infer<typeof couponTemplateSchema>;

/** Cupom individual */
export const couponSchema = z.object({
  code: z.string().min(4).max(20).toUpperCase().optional(),
  campaignId: z.string().min(1),
  userId: z.string().min(1),
  prizeId: z.string().optional(),
  validFrom: z.string().datetime({ offset: true }),
  validUntil: z.string().datetime({ offset: true }),
  rules: z.string().max(5000).optional(),
  isActive: z.boolean().default(true),
});

export type CouponInput = z.infer<typeof couponSchema>;

/** Sorteio CRUD */
export const drawSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  prizeId: z.string().min(1),
  campaignId: z.string().optional(),
  status: z.nativeEnum(DrawStatus),
  drawDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }),
  rules: z.string().min(10).max(5000),
  minCoinsRequired: z.number().int().min(0).optional(),
  winnerCount: z.number().int().min(1).default(1),
});

export type DrawInput = z.infer<typeof drawSchema>;

/** Prêmio CRUD */
export const prizeSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  type: z.nativeEnum(PrizeType),
  imageUrl: z.string().url().optional(),
  estimatedValue: z.number().min(0).optional(),
  quantity: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

export type PrizeInput = z.infer<typeof prizeSchema>;

/** Admin CRUD */
export const adminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.nativeEnum(AdminRole),
  isActive: z.boolean().default(true),
});

export type AdminInput = z.infer<typeof adminSchema>;

/** Notificação push */
export const notificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  type: z.nativeEnum(NotificationType),
  audience: z.nativeEnum(NotificationAudience),
  targetCityId: z.string().optional(),
  targetState: z.string().optional(),
  targetCampaignId: z.string().optional(),
  targetUserId: z.string().optional(),
  data: z.record(z.string()).optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
});

export type NotificationInput = z.infer<typeof notificationSchema>;

/** Progresso de vídeo */
export const videoProgressSchema = z.object({
  campaignId: z.string().min(1),
  videoId: z.string().min(1),
  currentTimeSeconds: z.number().min(0),
  durationSeconds: z.number().min(0),
});

export type VideoProgressInput = z.infer<typeof videoProgressSchema>;

/** Confirmação de rede social */
export const socialActionSchema = z.object({
  campaignId: z.string().min(1),
  sponsorId: z.string().optional(),
  network: z.nativeEnum(SocialNetwork),
});

export type SocialActionInput = z.infer<typeof socialActionSchema>;

/** Upload de vídeo metadata */
export const videoUploadSchema = z.object({
  title: z.string().min(1).max(200),
  campaignId: z.string().optional(),
  scope: z.nativeEnum(VideoScope),
  originalFileName: z.string().min(1),
});

export type VideoUploadInput = z.infer<typeof videoUploadSchema>;

/** Configuração de moedas */
export const coinSettingsSchema = z.object({
  rewardAmount: z.number().int().min(1),
  requiredForReward: z.number().int().min(1),
  expirationDays: z.number().int().min(0).optional(),
  campaignBonus: z.number().int().min(0).optional(),
  referralBonus: z.number().int().min(0).optional(),
  socialActionBonus: z.number().int().min(0).optional(),
});

export type CoinSettingsInput = z.infer<typeof coinSettingsSchema>;

/** Patrocinador CRUD */
export const sponsorSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  videoId: z.string().optional(),
  prizeId: z.string().optional(),
  socialLinks: z
    .object({
      INSTAGRAM: z.string().url().optional().or(z.literal('')),
      FACEBOOK: z.string().url().optional().or(z.literal('')),
      TIKTOK: z.string().url().optional().or(z.literal('')),
      WHATSAPP: z.string().url().optional().or(z.literal('')),
    })
    .optional()
    .default({}),
  isActive: z.boolean().default(true),
});

export type SponsorInput = z.infer<typeof sponsorSchema>;

/** Banner CRUD */
export const bannerSchema = z.object({
  title: z.string().min(2).max(200),
  imageUrl: z.string().url(),
  linkUrl: z.string().url().optional().or(z.literal('')),
  linkCampaignId: z.string().optional(),
  scope: z.nativeEnum(BannerScope),
  cityId: z.string().optional(),
  state: z.string().optional(),
  sponsorId: z.string().optional(),
  rotationSeconds: z.number().int().min(2).max(60).default(5),
  sequenceOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type BannerInput = z.infer<typeof bannerSchema>;

/** Prêmio da raspadinha */
export const scratchCardPrizeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  weight: z.number().int().min(1).default(1),
});

export const scratchCardSettingsSchema = z.object({
  prizes: z.array(scratchCardPrizeSchema).min(1),
  isActive: z.boolean().default(true),
});

export type ScratchCardSettingsInput = z.infer<typeof scratchCardSettingsSchema>;

/** Catálogo de resgate de moedas */
export const coinRewardCatalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  coinCost: z.number().int().min(1),
  isActive: z.boolean().default(true),
});

export const coinRewardsCatalogSchema = z.object({
  rewards: z.array(coinRewardCatalogItemSchema),
});

export type CoinRewardsCatalogInput = z.infer<typeof coinRewardsCatalogSchema>;

/** Geração de cupons por compra de pizza */
export const purchaseCouponsSchema = z.object({
  campaignId: z.string().min(1),
  userId: z.string().min(1),
  pizzaCount: z.number().int().min(1).max(MAX_PIZZA_COUPONS_PER_PURCHASE),
});

export type PurchaseCouponsInput = z.infer<typeof purchaseCouponsSchema>;

/** Vínculo campanha-patrocinador */
export const campaignSponsorLinkSchema = z.object({
  campaignId: z.string().min(1),
  sponsorId: z.string().min(1),
  sequenceOrder: z.number().int().min(0),
});

export type CampaignSponsorLinkInput = z.infer<typeof campaignSponsorLinkSchema>;

/** Validação de scan QR */
export const qrScanSchema = z.object({
  payload: z.string().min(1),
  scannerType: z.string().default('QR_CODE'),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
    })
    .optional(),
  deviceId: z.string().optional(),
});

export type QrScanInput = z.infer<typeof qrScanSchema>;

/** Participação em sorteio */
export const drawParticipationSchema = z.object({
  drawId: z.string().min(1),
});

export type DrawParticipationInput = z.infer<typeof drawParticipationSchema>;

/** Filtros dashboard */
export const dashboardFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cityId: z.string().optional(),
  state: z.string().optional(),
  campaignId: z.string().optional(),
  userId: z.string().optional(),
});

export type DashboardFiltersInput = z.infer<typeof dashboardFiltersSchema>;

/** Paginação */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/** Sanitização de string */
export function sanitizeString(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

/** Valida e sanitiza input com schema Zod */
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
