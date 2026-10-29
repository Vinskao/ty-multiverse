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
        // 2026-10-28: the browser tab shows just the site name; the one-line pitch is the page heading, not the tab title.
        expect(home).toContain('title="TY 市場研究室"');
        expect(home).toContain('data-i18n="home.heroTitle">今天起，用一頓飯的錢，雇用一位頂級機構研究員，以及一位大數據工程師</h1>');
        expect(home).not.toContain('免寫程式的量化研究');
        expect(home).toContain('<HomeContact />');
        expect(home).not.toContain('mailto:'); // every email link goes through src/scripts/contact.ts
        expect(home).toMatch(/class="home-product-contact" href=\{mailtoHref\('trial', 'zh'\)\} data-contact-topic="trial"/);
        expect(source('src/components/HomeContact.astro')).toContain('id="contact"');
        expect(source('src/scripts/contact.ts')).toContain("CONTACT_EMAIL = 'tianyikao@gmail.com'");
        expect(home).toContain('預計按使用量計費');
        expect(home).toContain('價格與開放方式尚未公布');
        expect(home).toContain('canonical="https://peoplesystem.tatdvsonorth.com/tymultiverse"');
    });

    it('describes the founder as a former desk researcher and independent investor', () => {
        const home = JSON.parse(source('src/storages/i18n.json')).home;
        expect(home.heroTagline.zh).toContain('曾在避險基金交易室做研究');
        expect(home.heroTagline.zh).toContain('之後多年以個人投資人的身分自行研究與交易');
        expect(home.productAudience.zh).toContain('持倉集中度');
        expect(home.heroTagline.en).toContain('then spent years researching and trading independently');
        expect(home.productAudience.en).toContain('position risk');
    });

    // 2026-10-29: the product is not a toolkit for building your own research method. It pushes research to the reader
    // (tickers, the technology behind them, the macro backdrop) and the reader's one job is adding reports to the library.
    it('sells an active researcher and data processor for fund managers, not a DIY research method', () => {
        const json = JSON.parse(source('src/storages/i18n.json')).home;
        const copy = ['heroTitle', 'heroTagline', 'productAudience', 'productWorkflow', 'productCollectTitle', 'productCollectBody',
            'productJudgeTitle', 'productJudgeBody', 'productDecideTitle', 'productDecideBody', 'productFaqTitle', 'productFaqBody',
            'contactTitle'].flatMap(key => [json[key].zh, json[key].en]).join(' | ');
        const page = source('src/pages/index.astro');
        for (const old of ['建立自己的', '自己的量化研究', '不會寫程式', '改變看法的條件']) {
            expect(copy + page).not.toContain(old);
        }
        expect(json.heroTitle.zh).toContain('大數據工程師');
        expect(json.heroTitle.en).toContain('big-data engineer');
        expect(json.heroTagline.zh).toMatch(/標的/);
        expect(json.heroTagline.zh).toMatch(/技術/);
        expect(json.heroTagline.zh).toMatch(/總體經濟|總經/);
        expect(json.productWorkflow.zh).toMatch(/報告/);
        expect(json.productDecideBody.zh).toMatch(/研究圖像/);
        expect(json.productDecideBody.zh).toMatch(/標的/);
        expect(json.productFaqTitle.zh).toContain('研究方法');
        expect(source('src/pages/index.astro')).toContain('description="今天起，用一頓飯的錢，雇用一位頂級機構研究員，以及一位大數據工程師');
    });

    it('keeps the server-rendered Chinese identical to the i18n source, so the page does not flash different words on load', () => {
        const json = JSON.parse(source('src/storages/i18n.json')).home;
        const page = source('src/pages/index.astro');
        for (const key of ['heroTitle', 'heroTagline', 'productAudience', 'productWorkflow', 'productCollectTitle', 'productCollectBody',
            'productJudgeTitle', 'productJudgeBody', 'productDecideTitle', 'productDecideBody', 'productFaqTitle', 'productFaqBody']) {
            expect(page, key).toContain(`data-i18n="home.${key}">${json[key].zh}<`);
        }
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
