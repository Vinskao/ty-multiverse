import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindAboutLanguage, clearAboutPrefetch, prefetchAboutLanguage, replaceAboutContent } from '../../src/scripts/aboutLanguage';

const markup = (language: string, label: string) => `<!doctype html><html lang="${language}"><body><main class="wrapper about about-mono"><p data-about-language-status role="status" hidden></p><h1>${label}</h1><section id="about-resume-preview">${label} resume</section></main></body></html>`;

describe('About language content swap', () => {
  beforeEach(() => {
    clearAboutPrefetch();
    document.documentElement.lang = 'en';
    document.body.innerHTML = '<main class="wrapper about about-mono"><p data-about-language-status role="status" hidden></p><h1>English</h1><section id="about-resume-preview">English resume</section></main>';
    window.history.replaceState(null, '', '/about/?lang=en');
  });

  it('updates the profile and resume in place, records the language, and emits a content event', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => markup('zh-Hant', '繁體中文') });
    vi.stubGlobal('fetch', fetchMock);
    const updated = vi.fn();
    const replaceState = vi.spyOn(window.history, 'replaceState');
    document.addEventListener('about:content-updated', updated, { once: true });

    await replaceAboutContent('zh');

    expect(document.querySelector('.about h1')?.textContent).toBe('繁體中文');
    expect(document.querySelector('#about-resume-preview')?.textContent).toContain('繁體中文 resume');
    expect(document.documentElement.lang).toBe('zh-Hant');
    expect(replaceState).toHaveBeenLastCalledWith(null, '', expect.stringContaining('lang=zh'));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('lang=zh'), expect.objectContaining({ cache: 'no-store' }));
    expect(updated).toHaveBeenCalledOnce();
  });

  it('reports an incomplete response without replacing the page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '<html><body>No profile</body></html>' }));
    await expect(replaceAboutContent('zh')).resolves.toBe(false);
    expect(document.querySelector('.about h1')?.textContent).toBe('English');
    expect(document.querySelector('[data-about-language-status]')?.textContent).toContain('語言切換失敗');
  });

  it('does not navigate away during a successful language switch', async () => {
    document.body.insertAdjacentHTML('beforeend', '<aside id="unrelated-state">Keep this page state</aside>');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => markup('zh-Hant', '繁體中文') }));

    await replaceAboutContent('zh');

    expect(document.querySelector('.about h1')?.textContent).toBe('繁體中文');
    expect(document.querySelector('#unrelated-state')?.textContent).toBe('Keep this page state');
  });

  it('keeps the current page and reports a network failure without navigating', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(replaceAboutContent('zh')).resolves.toBe(false);

    expect(document.querySelector('.about h1')?.textContent).toBe('English');
    expect(document.querySelector('[data-about-language-status]')?.textContent).toContain('語言切換失敗');
  });

  it('binds AppLang changes to an in-place About update', async () => {
    let listener: ((event: { code: string }) => void) | undefined;
    const unsubscribe = vi.fn();
    const appLang = {
      onChange: vi.fn((callback: (event: { code: string }) => void) => {
        listener = callback;
        return unsubscribe;
      }),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => markup('zh-Hant', '繁體中文'),
    }));

    const cleanup = bindAboutLanguage(appLang);
    listener?.({ code: 'zh' });
    await vi.waitFor(() => expect(document.querySelector('.about h1')?.textContent).toBe('繁體中文'));

    expect(document.documentElement.lang).toBe('zh-Hant');
    expect(cleanup).toBe(unsubscribe);
    cleanup();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe('About language switch feedback (the server render can take seconds)', () => {
  beforeEach(() => {
    clearAboutPrefetch();
    document.documentElement.lang = 'zh-Hant';
    document.body.innerHTML = '<main class="wrapper about about-mono"><p data-about-language-status role="status" hidden></p><h1>繁體中文</h1></main>';
    window.history.replaceState(null, '', '/about/?lang=zh');
  });

  it('stays quiet for a fast swap and says it is switching only when the page is slow', async () => {
    vi.useFakeTimers();
    let finish!: (value: unknown) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { finish = resolve; })));
    const pending = replaceAboutContent('en');
    const status = document.querySelector<HTMLElement>('[data-about-language-status]')!;
    expect(status.hidden).toBe(true);
    await vi.advanceTimersByTimeAsync(400);
    expect(status.hidden).toBe(false);
    expect(status.textContent).toBe('Switching language…');
    expect(document.querySelector('main.about-mono')?.getAttribute('aria-busy')).toBe('true');
    finish({ ok: true, text: async () => markup('en', 'English') });
    await expect(pending).resolves.toBe(true);
    expect(document.querySelector('h1')?.textContent).toBe('English');
    vi.useRealTimers();
  });

  it('swaps instantly from a prefetched copy without another request or any message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => markup('en', 'English') });
    vi.stubGlobal('fetch', fetchMock);
    await prefetchAboutLanguage('en');
    expect(fetchMock).toHaveBeenCalledOnce();
    await expect(replaceAboutContent('en')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(document.querySelector('h1')?.textContent).toBe('English');
    expect(document.documentElement.lang).toBe('en');
  });

  it('gives up with a visible message when the server never answers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const pending = replaceAboutContent('en');
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(pending).resolves.toBe(false);
    expect(document.querySelector('[data-about-language-status]')?.textContent).toContain('Language could not be changed');
    expect(document.querySelector('main.about-mono')?.hasAttribute('aria-busy')).toBe(false);
    vi.useRealTimers();
  });
});
