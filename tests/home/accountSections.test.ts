import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { setAccountSections } from '../../src/scripts/market/accountSections';

// Signed-out visitors saw an empty "Account Portfolio" (all "--") on the homepage (reported 2026-10-26).
it('hides account-only blocks until the visitor is signed in', () => {
    document.body.innerHTML = '<section id="a" data-account-only></section><div id="b" data-account-only></div><section id="public"></section>';
    setAccountSections(document, false);
    expect(document.getElementById('a')!.hidden).toBe(true);
    expect(document.getElementById('b')!.hidden).toBe(true);
    expect(document.getElementById('public')!.hidden).toBe(false);
    setAccountSections(document, true);
    expect(document.getElementById('a')!.hidden).toBe(false);
    expect(document.getElementById('b')!.hidden).toBe(false);
});

it('marks the portfolio card, allocation donuts and daily history as account-only and hidden in server HTML', () => {
    const home = readFileSync(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8');
    expect(home).toMatch(/<section id="portfolio-section"[^>]*data-account-only[^>]*hidden/);
    expect(home).toMatch(/<div class="portfolio-donuts-fullwidth"[^>]*data-account-only[^>]*hidden/);
    expect(home).toMatch(/<section id="portfolio-history-section"[^>]*data-account-only[^>]*hidden/);
});
