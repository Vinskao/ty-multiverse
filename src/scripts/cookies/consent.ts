export const COOKIE_CONSENT_STORAGE_KEY = 'tym-cookie-consent-v1';

export interface CookieConsent {
  version: 1;
  necessary: true;
  analytics: boolean;
  advertising: boolean;
  updatedAt: string;
}

export type CookieConsentChoice = Pick<CookieConsent, 'analytics' | 'advertising'>;

export function clearStoragePreservingConsent(storage: Pick<Storage, 'getItem' | 'setItem' | 'clear'>): void {
  const consent = storage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  storage.clear();
  if (consent !== null) storage.setItem(COOKIE_CONSENT_STORAGE_KEY, consent);
}

export function readCookieConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed.version !== 1 || parsed.necessary !== true || typeof parsed.analytics !== 'boolean' || typeof parsed.advertising !== 'boolean' || typeof parsed.updatedAt !== 'string') return null;
    return parsed as CookieConsent;
  } catch {
    return null;
  }
}

export function saveCookieConsent(choice: CookieConsentChoice, updatedAt = new Date().toISOString()): string {
  return JSON.stringify({ version: 1, necessary: true, analytics: choice.analytics, advertising: choice.advertising, updatedAt } satisfies CookieConsent);
}

export function hasAdvertisingConsent(raw: string | null): boolean {
  return readCookieConsent(raw)?.advertising ?? true;
}
