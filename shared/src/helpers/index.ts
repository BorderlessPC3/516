import { APP_SCHEME, VIDEO_COMPLETION_THRESHOLD } from '../constants';

/** Formata telefone brasileiro para exibição */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  return phone;
}

/** Normaliza telefone para formato +55XXXXXXXXXXX */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) {
    return `+${digits}`;
  }
  return `+55${digits}`;
}

/** Calcula percentual assistido */
export function calculateWatchedPercent(currentTime: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(1, currentTime / duration);
}

/** Verifica se vídeo foi concluído */
export function isVideoCompleted(
  watchedPercent: number,
  threshold: number = VIDEO_COMPLETION_THRESHOLD,
): boolean {
  return watchedPercent >= threshold;
}

/** Formata moedas */
export function formatCoins(amount: number): string {
  return `${amount.toLocaleString('pt-BR')} moeda${amount !== 1 ? 's' : ''}`;
}

/** Formata data para pt-BR */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Formata data e hora */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Converte Firestore timestamp para Date */
export function toDate(value: Date | string | { seconds: number; nanoseconds?: number }): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'object' && 'seconds' in value) {
    return new Date(value.seconds * 1000);
  }
  return new Date();
}

/** Gera código de cupom aleatório */
export function generateCouponCode(prefix = 'HP'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix;
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Calcula offset de paginação */
export function getPaginationOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/** Verifica se campanha está ativa */
export function isCampaignActive(
  status: string,
  startDate: Date,
  endDate: Date,
  now: Date = new Date(),
): boolean {
  return status === 'ACTIVE' && now >= startDate && now <= endDate;
}

/** Parse deep link do app */
export function parseDeepLink(url: string): { path: string; params: Record<string, string> } {
  try {
    const parsed = new URL(url.replace(`${APP_SCHEME}://`, 'https://placeholder/'));
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return { path: parsed.pathname, params };
  } catch {
    return { path: url, params: {} };
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Retry com backoff exponencial */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
      }
    }
  }
  throw lastError;
}

/** Gera código de indicação */
export function generateReferralCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

/** Exporta dados para CSV */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.join(',');
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val = row[col];
          const str = val == null ? '' : String(val);
          return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(','),
    )
    .join('\n');
  return `${header}\n${body}`;
}

/** Parse payload QR para campaignId */
export function parseQrCampaignId(data: string, scheme = APP_SCHEME): string | undefined {
  if (data.includes('campaignId=')) {
    try {
      const url = new URL(data.replace(`${scheme}://`, 'https://x/'));
      return url.searchParams.get('campaignId') ?? undefined;
    } catch {
      return undefined;
    }
  }
  if (data.startsWith('HP:')) {
    return data.replace('HP:', '');
  }
  return undefined;
}

/** Debounce helper type */
export type DebouncedFunction<T extends (...args: unknown[]) => unknown> = (
  ...args: Parameters<T>
) => void;

/** Cria função debounced */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}
