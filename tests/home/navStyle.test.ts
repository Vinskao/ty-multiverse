import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/nav.css'), 'utf8');
const navRule = css.match(/^nav \{[^}]*\}/m)![0];

it('draws the nav bar with a translucent blurred glass background', () => {
    expect(navRule).toMatch(/background(?:-color)?:\s*color-mix\(in srgb, var\(--gray-999\)\s+\d+%, transparent\)/);
    expect(navRule).toMatch(/backdrop-filter:\s*blur\(/);
    expect(navRule).toMatch(/border-bottom:\s*1px solid/);
});

it('keeps the opened mobile menu solid so its links stay readable', () => {
    expect(css).toMatch(/\.menu-content \{[^}]*background-color: color-mix\(in srgb, var\(--gray-999\) 98%, transparent\)/);
});
