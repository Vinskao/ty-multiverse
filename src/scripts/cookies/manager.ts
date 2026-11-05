import { COOKIE_CONSENT_STORAGE_KEY, readCookieConsent, saveCookieConsent, type CookieConsentChoice } from './consent';

const copy = {
  zh: {
    settings: 'Cookie 設定', change: '變更 Cookie 設定', privacy: '隱私權說明', title: 'Cookie 與隱私選擇',
    intro: '必要 Cookie 用於登入、網站安全與保存你的選擇。廣告 Cookie 預設開啟，讓廣告正常顯示；你可在這裡關閉。統計 Cookie 目前不載入第三方工具。',
    necessary: '必要 Cookie（固定開啟）', analytics: '統計 Cookie（目前未使用）', advertising: '廣告 Cookie（預設開啟）',
    accept: '知道了', reject: '僅必要 Cookie', customize: '設定', save: '儲存偏好', close: '關閉',
    banner: '網站使用必要 Cookie 與廣告 Cookie。你可以開啟設定查看、變更或關閉非必要 Cookie。',
  },
  en: {
    settings: 'Cookie settings', change: 'Change cookie settings', privacy: 'Privacy notice', title: 'Cookie and privacy choices',
    intro: 'Necessary cookies support sign-in, site security and saving your choices. Advertising cookies are on by default so ads can display; you can turn them off here. No third-party analytics tool is currently loaded.',
    necessary: 'Necessary cookies (always on)', analytics: 'Analytics cookies (not currently used)', advertising: 'Advertising cookies (on by default)',
    accept: 'Got it', reject: 'Necessary only', customize: 'Settings', save: 'Save preferences', close: 'Close',
    banner: 'This site uses necessary and advertising cookies. Open settings to review, change or turn off optional cookies.',
  },
};

export function mountCookieConsent(root: ParentNode = document): void {
  const panel = root.querySelector<HTMLElement>('[data-cookie-consent]');
  if (!panel || panel.dataset.bound === 'true') return;
  panel.dataset.bound = 'true';
  const banner = panel.querySelector<HTMLElement>('[data-cookie-banner]');
  const menu = panel.querySelector<HTMLElement>('[data-cookie-menu]');
  const dialog = panel.querySelector<HTMLDialogElement>('[data-cookie-dialog]');
  const analytics = panel.querySelector<HTMLInputElement>('[data-cookie-analytics]');
  const advertising = panel.querySelector<HTMLInputElement>('[data-cookie-advertising]');
  const gear = panel.querySelector<HTMLButtonElement>('[data-cookie-gear]');
  if (!banner || !menu || !dialog || !analytics || !advertising || !gear) return;

  const language = () => (window as Window & { AppLang?: { get?: () => string } }).AppLang?.get?.().toLowerCase().startsWith('en') ? 'en' : 'zh';
  const translate = () => {
    const strings = copy[language()];
    panel.querySelectorAll<HTMLElement>('[data-cookie-copy]').forEach(el => {
      const key = el.dataset.cookieCopy as keyof typeof strings | undefined;
      if (key) el.textContent = strings[key];
    });
    gear.setAttribute('aria-label', strings.settings);
  };
  const saved = () => readCookieConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  const openPreferences = () => {
    const state = saved();
    analytics.checked = state?.analytics ?? false;
    advertising.checked = state?.advertising ?? true;
    menu.hidden = true;
    gear.setAttribute('aria-expanded', 'false');
    if (!dialog.open) dialog.showModal();
  };
  const persist = (choice: CookieConsentChoice) => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, saveCookieConsent(choice));
    banner.hidden = true;
    menu.hidden = true;
    gear.setAttribute('aria-expanded', 'false');
    dialog.close();
    window.dispatchEvent(new CustomEvent('cookie-consent:changed', { detail: readCookieConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)) }));
  };

  gear.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    gear.setAttribute('aria-expanded', String(!menu.hidden));
  });
  panel.querySelectorAll('[data-cookie-open-preferences]').forEach(button => button.addEventListener('click', openPreferences));
  panel.addEventListener('click', event => {
    const action = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-cookie-accept], [data-cookie-reject]');
    if (action?.matches('[data-cookie-accept]')) persist({ analytics: false, advertising: true });
    if (action?.matches('[data-cookie-reject]')) persist({ analytics: false, advertising: false });
  });
  panel.querySelector('[data-cookie-save]')?.addEventListener('click', () => persist({ analytics: analytics.checked, advertising: advertising.checked }));
  panel.querySelector('[data-cookie-close]')?.addEventListener('click', () => dialog.close());
  document.addEventListener('click', event => {
    if (!panel.contains(event.target as Node)) menu.hidden = true;
  });
  const applyState = () => { banner.hidden = !!saved(); };
  translate();
  applyState();
  document.addEventListener('astro:page-load', translate);
  (window as Window & { AppLang?: { onChange?: (callback: () => void) => (() => void) } }).AppLang?.onChange?.(translate);
}
