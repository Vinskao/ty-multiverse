import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/nav.css'), 'utf8');
const mobile = css.slice(css.indexOf('@media (max-width: 49.99em)'), css.indexOf('/* 小螢幕手機版 RWD 樣式 */'));

it('keeps the mobile menu footer controls clear of the fixed Maya and theme buttons', () => {
  const footer = mobile.match(/\.menu-footer \{[^}]*align-items: center[^}]*\}/)![0];
  // The floating chat button (60px, 30px from the bottom) and theme toggle sit over the bottom ~6rem.
  expect(footer).toMatch(/padding-bottom:\s*calc\(6\.5rem \+ env\(safe-area-inset-bottom\)\)/);
});
