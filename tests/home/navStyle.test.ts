import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/nav.css'), 'utf8');
const navRule = css.match(/^nav \{[^}]*\}/m)![0];

// 2026-10-27: the bar changed from near-black (92% --gray-999, border, blur) to transparent.
it('draws the nav bar transparent, without a border or blur', () => {
    expect(navRule).toMatch(/background-color:\s*transparent/);
    expect(navRule).not.toMatch(/border-bottom:\s*1px/);
    expect(navRule).not.toMatch(/backdrop-filter/);
});

it('keeps the opened mobile menu solid so its links stay readable', () => {
    expect(css).toMatch(/\.menu-content \{[^}]*background-color: color-mix\(in srgb, var\(--gray-999\) 98%, transparent\)/);
});
