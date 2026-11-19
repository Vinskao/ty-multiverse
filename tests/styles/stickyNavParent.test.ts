import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/global.css', 'utf8');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\n)${selector}\s*\{([^}]*)\}`))?.[1] ?? '';

describe('sticky navbar parent', () => {
    it('lets body grow with the page, since a sticky nav only sticks inside its parent', () => {
        expect(rule('body')).not.toMatch(/(^|[;\s])height:\s*100%/);
        expect(css).toMatch(/body\s*\{\s*min-height:\s*100%/);
    });
});

describe('mobile navbar', () => {
    it('stays sticky on phones instead of scrolling away with the page', () => {
        const navCss = readFileSync('src/styles/nav.css', 'utf8');
        const mobile = navCss.slice(navCss.indexOf('@media (max-width: 49.99em)'));
        const header = mobile.match(/nav:has\(> \.menu-header\)\s*\{([^}]*)\}/)?.[1] ?? '';
        expect(header).not.toMatch(/position:\s*relative/);
    });
});
