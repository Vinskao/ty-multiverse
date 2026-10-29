import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(resolve(process.cwd(), 'src/styles/market-macro.css'), 'utf8'));

describe('macro convergence chart widths', () => {
  it('limits convergence cards to two columns so charts keep a readable width', () => {
    const columns: string[] = [];
    css.walkRules(rule => {
      if (rule.parent?.type === 'root' && rule.selector.split(',').map(s => s.trim()).includes('.macro-chain-focus')) {
        rule.walkDecls('grid-template-columns', decl => columns.push(decl.value));
      }
    });

    expect(columns.map(value => value.replace(/\s+/g, ''))).toContain('repeat(2,minmax(0,1fr))');
  });

  it('stacks convergence cards on narrow screens', () => {
    let mobileColumns: string[] = [];
    css.walkAtRules('media', rule => {
      if (rule.params !== '(max-width:640px)') return;
      rule.walkRules('.macro-chain-focus', nested => {
        nested.walkDecls('grid-template-columns', decl => mobileColumns.push(decl.value));
      });
    });

    expect(mobileColumns.map(value => value.replace(/\s+/g, ''))).toContain('minmax(0,1fr)');
  });
});
