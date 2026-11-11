import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/nav.css'), 'utf8');
const navRule = css.match(/^nav \{[^}]*\}/m)![0];

// 2026-11-05: the blur was removed on purpose. backdrop-filter makes the nav the containing block of its
// position: fixed children, which pinned the desktop cookie notice to the bar instead of the viewport.
it('draws the nav bar translucent with a hairline border and no backdrop filter', () => {
    expect(navRule).toMatch(/background(?:-color)?:\s*color-mix\(in srgb, var\(--gray-999\)\s+\d+%, transparent\)/);
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
