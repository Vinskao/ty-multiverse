import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initSubscribeForm } from '../../src/scripts/footer/subscribe';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('site footer', () => {
  it('groups links into product, about, developer and connect columns, with the subscribe form', () => {
    const footer = read('src/components/Footer.astro');
    for (const key of ['footer.product', 'footer.about', 'footer.developer', 'footer.connect']) expect(footer).toContain(key);
    for (const href of ['/reports/', '/macro/', '/stocks/', '/learn/', '/about/', '/privacy/', '/api-reference/', '/llms.txt', '/podcast.xml']) expect(footer).toContain(`'${href}'`);
    expect(footer).toContain('socialLinks.map');
    expect(footer).toContain('id="footer-subscribe"');
  });
});

describe('footer subscribe form', () => {
  const page = '<form id="footer-subscribe"><input type="email" name="email" /><button type="submit">訂閱</button><p id="footer-subscribe-status"></p></form>';
  beforeEach(() => { document.body.innerHTML = page; });
  afterEach(() => { vi.restoreAllMocks(); });
  const submit = async (email: string) => {
    (document.querySelector('input[name="email"]') as HTMLInputElement).value = email;
    document.getElementById('footer-subscribe')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((done) => setTimeout(done, 0));
  };

  it('posts the address and tells the reader to confirm by email', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: 'pending' }) } as Response));
    initSubscribeForm(document, fetcher);
    await submit(' reader@example.com ');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/market/subscriptions');
    expect(JSON.parse(String(options.body))).toEqual({ email: 'reader@example.com' });
    expect(document.getElementById('footer-subscribe-status')!.textContent).toContain('確認');
  });

  it('shows a plain failure and keeps the address so the reader can retry', async () => {
    initSubscribeForm(document, () => Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) } as Response));
    await submit('reader@example.com');
    expect(document.getElementById('footer-subscribe-status')!.textContent).toContain('明天');
    expect((document.querySelector('input[name="email"]') as HTMLInputElement).value).toBe('reader@example.com');
  });
});
