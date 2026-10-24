import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(resolve(__dirname, '../../src/styles/index.css'), 'utf8'));

it('keeps the instrument picker visible with independent desktop scrolling', () => {
  const declarations: Record<string, string> = {};
  css.walkRules(rule => {
    if (!rule.selector.split(',').map(s => s.trim()).includes('.market-watchlist')) return;
    if (rule.parent?.type !== 'atrule' || rule.parent.params !== '(min-width: 769px)') return;
    rule.walkDecls(decl => { declarations[decl.prop] = decl.value; });
  });
  expect(declarations).toMatchObject({
    position: 'sticky', top: '5rem', 'align-self': 'start',
    'max-height': 'calc(100dvh - 6rem)', 'overflow-y': 'auto',
    'scrollbar-gutter': 'stable',
  });
});

it('lets the chart section grow in document flow so it cannot cover the portfolio below', () => {
  let stickyChartSection = false;
  css.walkRules(rule => {
    if (!rule.selector.split(',').map(s => s.trim()).includes('.market-chart-section')) return;
    if (rule.parent?.type !== 'atrule' || rule.parent.params !== '(min-width: 769px)') return;
    rule.walkDecls('position', decl => { stickyChartSection ||= decl.value === 'sticky'; });
  });
  expect(stickyChartSection).toBe(false);
});
