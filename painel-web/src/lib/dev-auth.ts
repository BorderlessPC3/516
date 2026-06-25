const DEV_AUTH_KEY = 'painel_dev_auth';

export function isDevAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SKIP_AUTH === 'true';
}

export function setDevAuthSession(): void {
  sessionStorage.setItem(DEV_AUTH_KEY, '1');
}

export function hasDevAuthSession(): boolean {
  return sessionStorage.getItem(DEV_AUTH_KEY) === '1';
}

export function clearDevAuthSession(): void {
  sessionStorage.removeItem(DEV_AUTH_KEY);
}
