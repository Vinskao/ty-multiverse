import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindAboutLanguage, replaceAboutContent } from '../../src/scripts/aboutLanguage';

const markup = (language: string, label: string) => `<!doctype html><html lang="${language}"><body><main class="wrapper about about-mono"><p data-about-language-status role="status" hidden></p><h1>${label}</h1><section id="about-resume-preview">${label} resume</section></main></body></html>`;

describe('About language content swap', () => {
  beforeEach(() => {
    document.documentElement.lang = 'en';
    document.body.innerHTML = '<main class="wrapper about about-mono"><p data-about-language-status role="status" hidden></p><h1>English</h1><section id="about-resume-preview">English resume</section></main>';
    window.history.replaceState(null, '', '/tymultiverse/about/?lang=en');
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
