import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

// 2026-11-11: NavScript wrote an inline `display: block` onto the login/logout link on every update. Inline style beats
// the stylesheet's inline-flex, so the label stayed at the top of the fixed-height pill instead of centred.
it('never forces display on the login/logout link, so the stylesheet centres its label', () => {
  const script = readFileSync(resolve(process.cwd(), 'src/scripts/NavScript.ts'), 'utf8');
  expect(script).not.toMatch(/loginLogoutLink\.style\.display\s*=\s*'block'/);
});

it('centres the label in the stylesheet and keeps it centred even if a script sets display', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/nav.css'), 'utf8');
  const start = css.indexOf('.nav-auth .nav-auth-trigger.link {');
  expect(start).toBeGreaterThan(-1);
  const rule = css.slice(start, css.indexOf('}', start));
  expect(rule).toMatch(/display:\s*inline-flex/);
  expect(rule).toMatch(/align-items:\s*center/);
  expect(rule).toMatch(/justify-content:\s*center/);
});
