import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/pages/account-settings.astro', 'utf8');
const rule = (selector: string) => {
  const start = source.indexOf(selector + ' {');
  return start < 0 ? '' : source.slice(start, source.indexOf('}', start));
};

describe('account settings styles', () => {
  it('sets button background and text together so text stays readable in both themes', () => {
    const css = rule('.account-settings :global(button)');
    expect(css).toMatch(/background: var\(--gray-900\)/);
    expect(css).toMatch(/color: var\(--gray-0\)/);
    expect(css).toMatch(/min-height: 44px/);
  });
  it('puts the status action on its own line', () => {
    expect(rule('#access-status :global(button)')).toMatch(/display: block/);
  });
  it('keeps headings below the site-wide display sizes', () => {
    expect(rule('.account-settings h1')).toContain('--text-2xl');
    expect(rule('.account-settings h2')).toContain('--text-xl');
    expect(rule('.account-settings :global(h3)')).toContain('--text-lg');
  });
});
