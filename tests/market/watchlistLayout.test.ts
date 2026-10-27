import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(resolve(__dirname, '../../src/styles/index.css'), 'utf8'));

it('keeps the instrument picker in document flow so it cannot overlap the usage section', () => {
  const declarations: Record<string, string[]> = {};
  css.walkRules(rule => {
    if (!rule.selector.split(',').map(s => s.trim()).includes('.market-watchlist')) return;
    rule.walkDecls(decl => { (declarations[decl.prop] ??= []).push(decl.value); });
  });
  expect(declarations.position).toContain('static');
  expect(declarations.position).not.toContain('sticky');
  expect(declarations['overflow-y'] ?? []).not.toContain('auto');
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
