import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('homepage search and contact contract', () => {
    it('has one shared title and separate search / social descriptions', () => {
        const head = source('src/components/MainHead.astro');
        const layout = source('src/layouts/BaseLayout.astro');
        expect((head + layout).match(/<title[\s>]/g)).toHaveLength(1);
        expect(head).toContain('property="og:title"');
        expect(head).toContain('name="description" content={description}');
        expect(head).toContain('property="og:description" content={description}');
        expect(head).toContain('rel="canonical"');
    });

    it('explains the product in server HTML and sends enquiries to email', () => {
        const home = source('src/pages/index.astro');
        expect(home).toContain('免寫程式的量化研究與投資決策圖表');
        expect(home).toContain('免寫程式，建立自己的市場判斷');
        expect(home).toContain('<HomeContact />');
        expect(home).not.toContain('mailto:'); // every email link goes through src/scripts/contact.ts
        expect(home).toMatch(/class="home-product-contact" href=\{mailtoHref\('trial', 'zh'\)\} data-contact-topic="trial"/);
        expect(source('src/components/HomeContact.astro')).toContain('id="contact"');
        expect(source('src/scripts/contact.ts')).toContain("CONTACT_EMAIL = 'tianyikao@gmail.com'");
        expect(home).toContain('預計按使用量計費');
        expect(home).toContain('價格與開放方式尚未公布');
        expect(home).toContain('canonical="https://peoplesystem.tatdvsonorth.com/tymultiverse"');
    });
});

describe('page language defaults', () => {
    beforeEach(() => {
        const saved = new Map<string, string>();
        vi.spyOn(localStorage, 'getItem').mockImplementation((key) => saved.get(key) ?? null);
        vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => { saved.set(key, value); });
    });
    afterEach(() => { vi.restoreAllMocks(); delete window.AppLang; delete document.documentElement.dataset.defaultLanguage; });
    const load = () => new Function(source('public/scripts/lang.js'))();
    it('preserves the existing English fallback on other pages', () => {
        load();
        expect(window.AppLang.get()).toBe('en');
    });
    it('uses the homepage Chinese default until a reader chooses a language', () => {
        document.documentElement.dataset.defaultLanguage = 'zh';
        load();
        expect(window.AppLang.get()).toBe('zh');
        window.AppLang.set('en');
        expect(window.AppLang.get()).toBe('en');
    });
});
