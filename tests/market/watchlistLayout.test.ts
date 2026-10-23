import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(resolve(__dirname, '../../src/styles/index.css'), 'utf8'));

it.each(['.market-watchlist', '.market-chart-section'])('keeps %s visible with independent desktop scrolling', (selector) => {
  const declarations: Record<string, string> = {};
  css.walkRules(rule => {
    if (!rule.selector.split(',').map(s => s.trim()).includes(selector)) return;
    if (rule.parent?.type !== 'atrule' || rule.parent.params !== '(min-width: 769px)') return;
    rule.walkDecls(decl => { declarations[decl.prop] = decl.value; });
  });
  expect(declarations).toMatchObject({
    position: 'sticky', top: '5rem', 'align-self': 'start',
    'max-height': 'calc(100dvh - 6rem)', 'overflow-y': 'auto',
    'scrollbar-gutter': 'stable',
  });
});
