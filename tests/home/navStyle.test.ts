import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/nav.css'), 'utf8');
const navRule = css.match(/^nav:has\(> \.menu-header\) \{[^}]*position:\s*sticky[^}]*\}/m)?.[0] ?? '';

it('keeps footer navigation columns in normal flow at every screen width', () => {
    expect(css).not.toMatch(/^\s*nav\s*\{/m);
    expect(navRule).toMatch(/position:\s*sticky/);
});

// 2026-11-05: the blur was removed on purpose. backdrop-filter makes the nav the containing block of its
// position: fixed children, which pinned the desktop cookie notice to the bar instead of the viewport.
// 2026-11-18: 76% let the footer text show through the sticky bar; keep it at 94%+ so page content never reads through.
it('draws the nav bar nearly opaque with a hairline border and no backdrop filter', () => {
    expect(navRule).toMatch(/background(?:-color)?:\s*color-mix\(in srgb, var\(--gray-999\)\s+\d+%, transparent\)/);
    expect(Number(navRule.match(/var\(--gray-999\)\s+(\d+)%/)![1])).toBeGreaterThanOrEqual(94);
    expect(navRule).toMatch(/border-bottom:\s*1px solid/);
    expect(navRule).not.toMatch(/backdrop-filter/);
});

it('keeps the opened mobile menu solid so its links stay readable', () => {
    expect(css).toMatch(/\.menu-content \{[^}]*background-color: var\(--gray-999\);/);
});

it('keeps the account control a monochrome pill in both login states', () => {
    expect(css).toMatch(/\.nav-auth-trigger\s*\{[^}]*border-radius:\s*999px/s);
    expect(css).toMatch(/\.nav-auth-trigger\s*\{[^}]*background:\s*var\(--gray-100\)/s);
    expect(css).toMatch(/\.nav-auth-trigger\s*\{[^}]*color:\s*var\(--gray-999\)/s);
});
