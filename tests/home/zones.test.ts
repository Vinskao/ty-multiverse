import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const html = () => readFileSync(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8');
const css = () => readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('home page zones', () => {
  beforeEach(() => { document.body.innerHTML = html(); });

  it('puts every area in a labelled zone: reports, stocks, account, macro, other info, briefing, operations', () => {
    for (const id of ['zone-macro', 'zone-stocks', 'zone-account', 'zone-reports', 'zone-other', 'zone-briefing', 'zone-operations']) {
      const zone = document.getElementById(id);
      expect(zone?.classList.contains('home-zone'), id).toBe(true);
      expect(zone?.querySelector('.home-zone-title')?.textContent?.trim(), id).toBeTruthy();
    }
    expect(document.getElementById('zone-macro')?.querySelector('#macro-dashboard')).not.toBeNull();
    expect(document.getElementById('zone-reports')?.querySelector('#market-reports')).not.toBeNull();
    expect(document.getElementById('zone-operations')?.querySelector('.home-transparency')).not.toBeNull();
  });

  it('keeps the account zone signed-in only', () => {
    const account = document.getElementById('zone-account')!;
    expect(account.hasAttribute('data-account-only') && account.hasAttribute('hidden')).toBe(true);
    expect(account.querySelector('#portfolio-section')).not.toBeNull();
  });

  it('puts 其他資訊 (usage, chip summary) in its own zone after the research reports, not in the stock zone', () => {
    const other = document.getElementById('zone-other')!;
    expect(other.querySelector('#market-usage-section')).not.toBeNull();
    expect(other.querySelector('.market-brief-disclosure')).not.toBeNull();
    expect(document.getElementById('zone-stocks')!.querySelector('#market-usage-section')).toBeNull();
    expect(document.getElementById('zone-reports')!.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // 2026-11-10: macro sits above stocks (top-down: environment first, then the instrument). The first screen is title, search and library numbers; research reports lead the dashboard.
  it('orders the dashboard top-down: reports, macro, stocks, account, other info', () => {
    const order = ['zone-reports', 'zone-macro', 'zone-stocks', 'zone-account', 'zone-other'].map((id) => document.getElementById(id)!);
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING, order[i].id).toBeTruthy();
    }
  });

  // 2026-11-10: the hero search box was removed so it does not duplicate the nav bar search (Ctrl/⌘+K).
  it('keeps the hero to the title, copy and actions, without a second search box; the podcast, daily reading and company events share a later zone', () => {
    const header = document.querySelector('.hero-header')!;
    expect(header.querySelector('.home-product-title')).not.toBeNull();
    expect(header.querySelector('.home-product-actions')).not.toBeNull();
    expect(document.querySelector('#home-hero-search')).toBeNull();
    expect(header.querySelector('iframe')).toBeNull();
    expect(header.querySelector('#market-company-events')).toBeNull();
    const briefing = document.getElementById('zone-briefing')!;
    expect(briefing.querySelector('#home-daily-maya')).not.toBeNull();
    expect(briefing.querySelector('.hero-podcast iframe')).not.toBeNull();
    const events = document.getElementById('market-company-events')!;
    expect(events.closest('.home-briefing-row')).not.toBeNull();
    expect(events.closest('#market-overview')).toBeNull();
    expect(document.getElementById('market-overview')!.compareDocumentPosition(briefing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(briefing.compareDocumentPosition(document.querySelector('.home-product-intro')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('wraps the tagline and the audience line in one full-width block', () => {
    const copy = document.querySelector('.hero-copy')!;
    expect(copy.querySelector('[data-i18n="home.heroTagline"]')).not.toBeNull();
    expect(copy.querySelector('.home-product-audience')).not.toBeNull();
    expect(copy.querySelector('.home-product-actions')).toBeNull();
    expect(css()).toMatch(/.home-page .hero-copy {[^}]*width: 100%; max-width: none;/);
    expect(css()).toMatch(/.home-page .hero-copy p { max-width: none; }/);
  });

  it('gives the holdings list and 報告種類 the same panel class, and one shared width', () => {
    expect(document.getElementById('market-watchlist')?.classList.contains('market-side-panel')).toBe(true);
    expect(document.querySelector('.market-report-sidebar')?.classList.contains('market-side-panel')).toBe(true);
    const styles = css();
    expect(styles).toMatch(/\.home-page \.market-instrument-layout \{ grid-template-columns: var\(--side-panel-w\)/);
    expect(styles).toMatch(/\.home-page \.market-report-browser \{ grid-template-columns: var\(--side-panel-w\)/);
  });
});
