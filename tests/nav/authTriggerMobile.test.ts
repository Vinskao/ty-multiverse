import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('nav login button on mobile', () => {
  const css = readFileSync('src/styles/nav.css', 'utf8');
  const mobile = css.slice(css.indexOf('@media (max-width: 49.99em)'), css.indexOf('@media (max-width: 30em)'));

  it('is not left transparent with dark text by the generic mobile .link rule', () => {
    expect(mobile).toMatch(/\.link\.nav-auth-trigger\s*\{[^}]*background:\s*var\(--gray-100\)/);
    expect(mobile).toMatch(/\.link\.nav-auth-trigger\s*\{[^}]*color:\s*var\(--gray-999\)/);
  });
});
