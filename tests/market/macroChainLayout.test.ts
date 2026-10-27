import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import postcss from 'postcss';

it('scrolls the logic chain heading with its row instead of pinning it over chart controls', () => {
    const css = postcss.parse(readFileSync(resolve(process.cwd(), 'src/styles/market-macro.css'), 'utf8'));
    const positions: string[] = [];
    css.walkRules(rule => {
        if (!rule.selector.split(',').map(selector => selector.trim()).includes('.macro-chain-head')) return;
        rule.walkDecls('position', declaration => { positions.push(declaration.value); });
    });
    expect(positions).toContain('static');
    expect(positions).not.toContain('sticky');
    expect(positions).not.toContain('absolute');
});
