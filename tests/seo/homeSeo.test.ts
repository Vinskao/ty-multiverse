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
        expect(home).toContain('data-i18n="home.heroTitle">一起貢獻報告，共建投資研究平台</h1>');
        expect(home).not.toContain('免寫程式的量化研究');
        expect(home).toContain('<HomeContact />');
        expect(home).not.toContain('mailto:'); // every email link goes through src/scripts/contact.ts
        expect(home).toContain('class="home-product-contact" href="#market-reports"');
        expect(source('src/components/HomeContact.astro')).toContain('id="contact"');
        expect(source('src/scripts/contact.ts')).toContain("CONTACT_EMAIL = 'tianyikao@tymultiverse.cc'");
        expect(home).toContain('Miner · 選用的市場資料 API');
        expect(home).toContain('Maya 主播每日精讀');
        expect(home).toContain('api/market/daily-maya');
        expect(home).toContain('價格與開放方式尚未公布');
        expect(home).toContain('canonical="https://tymultiverse.cc/"');
    });

    it('describes shared evidence and independent decisions rather than selling the founder', () => {
        const home = JSON.parse(source('src/storages/i18n.json')).home;
        expect(home.heroTagline.zh).toContain('共同研究平台');
        expect(home.heroTagline.zh).toContain('互利共生');
        expect(home.productAudience.zh).toContain('自行做出投資決策');
        expect(home.heroTagline.en).toContain('shared research platform');
        expect(home.productAudience.en).toContain('make your own investment decisions');
    });

    // 2026-10-29: the product is not a toolkit for building your own research method. It pushes research to the reader
    // (tickers, the technology behind them, the macro backdrop) and the reader's one job is adding reports to the library.
    it('presents community research, technology and macro evidence without a DIY burden', () => {
        const json = JSON.parse(source('src/storages/i18n.json')).home;
        const copy = ['heroTitle', 'heroTagline', 'productAudience', 'productWorkflow', 'productCollectTitle', 'productCollectBody',
            'productJudgeTitle', 'productJudgeBody', 'productDecideTitle', 'productDecideBody', 'productFaqTitle', 'productFaqBody',
            'contactTitle'].flatMap(key => [json[key].zh, json[key].en]).join(' | ');
        const page = source('src/pages/index.astro');
        for (const old of ['建立自己的', '自己的量化研究', '不會寫程式', '改變看法的條件', '你只要把報告加進來', '你唯一要做的事', '預計按使用量計費']) {
            expect(copy + page).not.toContain(old);
        }
        expect(json.heroTitle.zh).toContain('共建投資研究平台');
        expect(json.heroTitle.en).toContain('research, together');
        expect(json.heroTagline.zh).toMatch(/標的/);
        expect(json.heroTagline.zh).toMatch(/技術/);
        expect(json.heroTagline.zh).toMatch(/總體經濟|總經/);
        expect(json.productWorkflow.zh).toMatch(/報告/);
        expect(json.productDecideBody.zh).toMatch(/研究圖像/);
        expect(json.productDecideBody.zh).toMatch(/標的/);
        expect(json.productFaqTitle.zh).toContain('研究方法');
        expect(source('src/pages/index.astro')).toContain(`description="${json.heroTagline.zh}"`);
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

// 2026-10-30: the site proactively brings the latest tickers and technology research; reports people contribute are an
// optional, shared community supplement. Ads run on the homepage, so only the API is described as paid.
describe('community narrative and pricing scope', () => {
    it('frames user reports as a shared community supplement, and the API as the only paid part', () => {
        const json = JSON.parse(source('src/storages/i18n.json')).home;
        const page = source('src/pages/index.astro');
        expect(json.productWorkflow.zh).toContain('最新');
        expect(json.productWorkflow.zh).toContain('標的');
        expect(json.productWorkflow.zh).toContain('社群報告');
        expect(json.productDecideTitle.zh).toContain('一起貢獻');
        expect(json.productDecideBody.zh).toContain('自己喜歡的報告');
        expect(json.productDecideBody.zh).toContain('社群');
        expect(json.productDecideBody.zh).not.toContain('唯一要做');
        expect(json.productPricingTitle.zh).toBe('Miner · 選用的市場資料 API');
        expect(json.productPricingBody.zh).toContain('免費開放');
        expect(json.productPricingBody.zh).toContain('廣告');
        expect(json.productPricingBody.zh).toContain('價格與開放方式尚未公布');
        expect(page).toContain('data-i18n="home.productPricingTitle">Miner · 選用的市場資料 API</summary>');
        expect(page).toContain('data-i18n="home.productWorkflow">社群報告匯成證據，發掘最新標的與技術');
        expect(source('src/pages/learn.astro')).toContain('市場快報｜Maya 主播精讀');
        expect(source('src/pages/learn.astro')).toContain('api/market/audio');
    });
});
