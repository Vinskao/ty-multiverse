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
