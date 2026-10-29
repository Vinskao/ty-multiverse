export type SiteLang = 'zh' | 'en';

/** One button flips the site language; its label names the language it switches to. */
export function langToggleState(current: string | null | undefined): { lang: SiteLang; next: SiteLang; label: string } {
  const lang: SiteLang = current === 'en' ? 'en' : 'zh';
  return lang === 'zh'
    ? { lang, next: 'en', label: 'Switch to English' }
    : { lang, next: 'zh', label: '切換為繁體中文' };
}
