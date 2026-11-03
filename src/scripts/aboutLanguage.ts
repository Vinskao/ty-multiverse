let latestSwap = 0;

export interface AboutLanguageController {
  onChange(callback: (event: { code: string }) => void): () => void;
  get(): string;
  set(code: 'zh' | 'en'): void;
}

function normalizeLanguage(code: string | null | undefined): 'zh' | 'en' {
  return code?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

/** Keep the shared language toggle and About's server-rendered profile in sync. */
export function bindAboutLanguage(appLang: AboutLanguageController): () => void {
  return appLang.onChange(({ code }) => {
    const nextLanguage = normalizeLanguage(code);
    const currentUrl = new URL(window.location.href);
    const currentLanguage = normalizeLanguage(currentUrl.searchParams.get('lang'));
    if (currentLanguage === nextLanguage) return;

    void replaceAboutContent(nextLanguage).then((updated) => {
      if (!updated) appLang.set(currentLanguage);
    });
  });
}

function showLanguageFailure(language: 'zh' | 'en'): false {
  document.querySelector('main.about-mono')?.removeAttribute('aria-busy');
  const status = document.querySelector<HTMLElement>('[data-about-language-status]');
  if (status) {
    status.textContent = language === 'zh'
      ? '語言切換失敗，請稍後再試。'
      : 'Language could not be changed. Please try again.';
    status.hidden = false;
  }
  return false;
}

function showLanguageProgress(language: 'zh' | 'en') {
  const status = document.querySelector<HTMLElement>('[data-about-language-status]');
  if (status) {
    status.textContent = language === 'zh' ? '語言切換中…' : 'Switching language…';
    status.hidden = false;
  }
  document.querySelector('main.about-mono')?.setAttribute('aria-busy', 'true');
}

const SWITCH_TIMEOUT_MS = 20_000;
const PROGRESS_DELAY_MS = 300;

// The other language's server render takes 1-5 s, so it is fetched in the background once the page is idle; a switch then
// swaps from this copy instantly. Cleared on reload (and a stale copy is replaced by the next prefetch).
const prefetched = new Map<'zh' | 'en', string>();

function languageUrl(language: 'zh' | 'en'): string {
  const url = new URL(window.location.href);
  url.searchParams.set('lang', language);
  return url.toString();
}

export function clearAboutPrefetch(): void {
  prefetched.clear();
}

export async function prefetchAboutLanguage(language: 'zh' | 'en'): Promise<void> {
  try {
    const response = await fetch(languageUrl(language), { cache: 'no-store', credentials: 'same-origin' });
    if (response.ok) prefetched.set(language, await response.text());
  } catch {
    // best effort: a switch simply fetches on demand
  }
}

/** Fetch the server-rendered language variant and replace only the About profile DOM. */
export async function replaceAboutContent(language: 'zh' | 'en'): Promise<boolean> {
  const requestId = ++latestSwap;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('lang', language);

  const cached = prefetched.get(language);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SWITCH_TIMEOUT_MS);
  const progressTimer = cached ? undefined : setTimeout(() => showLanguageProgress(language), PROGRESS_DELAY_MS);
  try {
    let html = cached;
    if (html === undefined) {
      const response = await fetch(nextUrl.toString(), { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      if (!response.ok) return showLanguageFailure(language);
      html = await response.text();
    }
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const currentProfile = document.querySelector('main.about-mono');
    const nextProfile = parsed.querySelector('main.about-mono');
    if (!currentProfile || !nextProfile) return showLanguageFailure(language);
    if (requestId !== latestSwap) return true;

    currentProfile.replaceWith(document.importNode(nextProfile, true));
    window.history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
    document.documentElement.dataset.defaultLanguage = language;
    document.title = language === 'zh' ? '關於｜TY Multiverse' : 'About | TY Multiverse';
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = language === 'zh' ? 'TY Multiverse 的產品故事、創辦人與團隊。' : 'The story, founder and team behind TY Multiverse.';
    }
    document.dispatchEvent(new CustomEvent('about:content-updated', { detail: { language } }));
    document.dispatchEvent(new Event('tym:mermaid-refresh'));
    return true;
  } catch {
    return showLanguageFailure(language);
  } finally {
    clearTimeout(timer);
    clearTimeout(progressTimer);
  }
}
