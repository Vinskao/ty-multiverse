import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('signed-in user and logout controls', () => {
  const nav = readFileSync('src/components/Nav.astro', 'utf8');
  const css = readFileSync('src/styles/nav.css', 'utf8');

  it('renders a separate sign-out icon button beside the user name', () => {
    expect(nav).toContain('data-auth-user-name');
    expect(nav).toContain('data-auth-logout');
    expect(nav).toContain('<Icon icon="sign-out"');
  });

  it('styles the logout control red and hides auth controls marked hidden', () => {
    expect(css).toMatch(/\.nav-logout-button\s*\{[^}]*background:\s*#dc2626/s);
    expect(css).toMatch(/\.nav-auth\s+\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
  });
});
