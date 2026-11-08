import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/nav.css', 'utf8');

/** Every top-level `nav { ... }` rule, including the ones inside media queries. */
function navRules(): string[] {
  return [...css.matchAll(/(?:^|\n)\s*nav\s*\{([^}]*)\}/g)].map(match => match[1]);
}


/** Rules for the one site header bar: the <nav> that directly contains .menu-header. */
function headerBarRules(): string[] {
  return [...css.matchAll(/nav:has\(>\s*\.menu-header\)\s*\{([^}]*)\}/g)].map(match => match[1]);
}

describe('nav bar height is fixed and never changes', () => {
  it('defines one height token', () => {
    expect(css).toMatch(/--nav-height:\s*3\.5rem/);
  });

  it('never fixes the height of other <nav> elements (sidebar menus, breadcrumbs) - only the site header bar', () => {
    for (const rule of navRules()) {
      expect(rule).not.toMatch(/(?:^|[;\s])(?:min-height|max-height|height):/);
    }
    const header = [...css.matchAll(/nav:has\(>\s*\.menu-header\)\s*\{([^}]*)\}/g)].map(match => match[1]);
    expect(header.length).toBeGreaterThanOrEqual(1);
  });

  it('every nav rule that sets a height uses the token for height, min-height and max-height', () => {
    const rules = headerBarRules();
    expect(rules.length).toBeGreaterThanOrEqual(1);
    const base = rules[0];
    expect(base).toMatch(/\bheight:\s*var\(--nav-height\)/);
    expect(base).toMatch(/\bmin-height:\s*var\(--nav-height\)/);
    expect(base).toMatch(/\bmax-height:\s*var\(--nav-height\)/);
    for (const rule of rules) {
      for (const [, value] of rule.matchAll(/(?:^|[;\s])(?:min-height|max-height|height):\s*([^;]+);/g)) {
        expect(value.trim()).toBe('var(--nav-height)');
      }
    }
  });

  it('the header row cannot grow either', () => {
    const header = [...css.matchAll(/\.menu-header\s*\{([^}]*)\}/g)].map(match => match[1]).join('\n');
    expect(header).toMatch(/height:\s*var\(--nav-height\)/);
    expect(header).not.toMatch(/min-height:\s*3/);
  });

  it('never lets the bar wrap its contents onto a second row', () => {
    expect(headerBarRules()[0]).toMatch(/flex-wrap:\s*nowrap|overflow-y:\s*visible/);
  });
});
