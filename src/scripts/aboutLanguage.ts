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
  const status = document.querySelector<HTMLElement>('[data-about-language-status]');
  if (status) {
    status.textContent = language === 'zh'
      ? '語言切換失敗，請稍後再試。'
      : 'Language could not be changed. Please try again.';
    status.hidden = false;
  }
  return false;
}

/** Fetch the server-rendered language variant and replace only the About profile DOM. */
export async function replaceAboutContent(language: 'zh' | 'en'): Promise<boolean> {
  const requestId = ++latestSwap;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('lang', language);

  try {
    const response = await fetch(nextUrl.toString(), { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) return showLanguageFailure(language);

    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const currentProfile = document.querySelector('main.about-mono');
    const nextProfile = parsed.querySelector('main.about-mono');
    if (!currentProfile || !nextProfile) return showLanguageFailure(language);
    if (requestId !== latestSwap) return true;

    currentProfile.replaceWith(document.importNode(nextProfile, true));
    window.history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
    document.documentElement.dataset.defaultLanguage = language;
    document.title = language === 'zh' ? '關於｜高天逸' : 'About | Tianyi Kao';
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = language === 'zh' ? 'TY Multiverse 創辦人高天逸的經歷與履歷。' : 'About Tianyi Kao and his experience.';
    }
    document.dispatchEvent(new CustomEvent('about:content-updated', { detail: { language } }));
    document.dispatchEvent(new Event('tym:mermaid-refresh'));
    return true;
  } catch {
    return showLanguageFailure(language);
  }
}
