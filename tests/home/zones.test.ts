import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const html = () => readFileSync(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8');
const css = () => readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('home page zones', () => {
  beforeEach(() => { document.body.innerHTML = html(); });

  it('puts every area in a labelled zone: macro, stocks, account, reports, other info, operations', () => {
    for (const id of ['zone-macro', 'zone-stocks', 'zone-account', 'zone-reports', 'zone-other', 'zone-operations']) {
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

  it('shows the recent company events to the right of the hero title, in the same row, not between the macro and stock areas', () => {
    const events = document.getElementById('market-company-events')!;
    const row = events.closest('.hero-title-row');
    expect(row).not.toBeNull();
    expect(row!.querySelector('.home-product-title')).not.toBeNull();
    expect(row!.querySelector('.home-product-actions')).toBeNull();
    expect(events.closest('#market-overview')).toBeNull();
  });

  it('gives the holdings list and 報告種類 the same panel class, and one shared width', () => {
    expect(document.getElementById('market-watchlist')?.classList.contains('market-side-panel')).toBe(true);
    expect(document.querySelector('.market-report-sidebar')?.classList.contains('market-side-panel')).toBe(true);
    const styles = css();
    expect(styles).toMatch(/\.home-page \.market-instrument-layout \{ grid-template-columns: var\(--side-panel-w\)/);
    expect(styles).toMatch(/\.home-page \.market-report-browser \{ grid-template-columns: var\(--side-panel-w\)/);
  });
});
