import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
describe('homepage responsive presentation', () => {
    it('presents maintenance experience instead of scored skill graphics', () => {
        const home = read('src/pages/index.astro');
        expect(home).toContain('<MaintainerExperience />');
        expect(home).not.toContain('<SkillsBubbleChart');
        expect(home).not.toContain('class="hero-side"');
        const team = read('src/components/MaintainerExperience.astro');
        expect(team).toContain('產品背後的維護經驗');
        expect(team).toContain('Tianyi Kao');
        expect(team).toContain('<details');
    });
    it('keeps range controls compact on mobile', () => {
        const css = read('src/styles/index.css');
        expect(css).not.toMatch(/\.market-chart-controls button, \.market-price-comparison select\s*\{\s*min-height:44px/);
        expect(css).toMatch(/\.market-chart-controls button\s*\{[^}]*min-height:28px/s);
    });
    it('keeps the holdings and custom selection groups in normal flow on narrow screens', () => {
        const css = read('src/styles/index.css');
        expect(css).toMatch(/\.market-overview-grid\s*\{[^}]*align-items:\s*start/s);
        expect(css).toMatch(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.market-watchlist\s*\{[^}]*position:\s*static/s);
    });
});

describe('homepage layout fixes (2026-10-26)', () => {
    const css = () => read('src/styles/index.css');
    it('left-aligns the market overview although it sits inside the centered .hero', () => {
        expect(css()).toMatch(/\.home-page \.market-overview\s*\{[^}]*text-align:left/);
        // Chart titles, ranges and readouts were centered by the same inheritance and stay centered.
        expect(css()).toMatch(/\.market-overview \.macro-trend-chart,[^{]*\.market-chart-controls,[^{]*\.market-chart-readout\s*\{\s*text-align:center/);
    });
    it('folds the text-only signal list for AI readers into a details element that stays in the HTML', () => {
        const brief = read('src/components/MarketBrief.astro');
        expect(brief).toMatch(/<details class="market-brief-ai">[\s\S]*class="market-brief-signals"[\s\S]*<\/details>/);
    });
    it('shows the skills bubble chart inside the full skills section', () => {
        const team = read('src/components/MaintainerExperience.astro');
        expect(team).toMatch(/<details class="maintenance-catalog"[\s\S]*<SkillsBubbleChart client:visible[\s\S]*<\/details>/);
    });
});

it('offers Gmail, Outlook and copy in the contact chooser, without the mail-app button that did nothing (2026-10-27)', () => {
    const contact = read('src/components/HomeContact.astro');
    expect(contact).not.toContain('contact-dialog-mailto');
    expect(contact).toContain('id="contact-dialog-gmail"');
    expect(contact).toContain('id="contact-dialog-outlook"');
    expect(contact).toContain('id="contact-dialog-copy"');
});

it('shows the macro logic chains by default with the indicator grid one tab away', () => {
    const home = read('src/pages/index.astro');
    expect(home).toMatch(/data-macro-view="chains"[^>]*>邏輯鏈/);
    expect(home).toContain('<div id="macro-chains" class="macro-chains" role="tabpanel">');
    expect(home).toMatch(/<div id="macro-indicator-grid" class="macro-group-grid" role="tabpanel" hidden>/);
});

it('hides the indicator grid and the release list while the logic chains view is selected (2026-10-27)', () => {
    const css = read('src/styles/market-macro.css');
    // display:grid on .macro-group-grid beat the hidden attribute, so the grid kept showing under the chains.
    expect(css).toMatch(/\.macro-group-grid\[hidden\]\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.macro-dashboard\[data-macro-view="chains"\]\s+#macro-event-list[^{]*\{[^}]*display:\s*none/);
    expect(read('src/pages/index.astro')).toMatch(/id="macro-dashboard"[^>]*data-macro-view="chains"/);
    expect(read('src/scripts/index.ts')).toContain("macro-dashboard')!.dataset.macroView");
});

it('left-aligns the notes section heading on every screen width (2026-10-27)', () => {
    const css = read('src/styles/index.css');
    // .section-title is text-align:center with auto margins, which kept 產品維護與開發筆記 centered inside the left header.
    expect(css).toMatch(/\.home-page \.with-cta \.section-header\s*\{[^}]*justify-self:\s*start[^}]*text-align:\s*left/);
    expect(css).toMatch(/\.home-page \.with-cta \.section-header \.section-title\s*\{[^}]*text-align:\s*left[^}]*margin:\s*0/);
});
