import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clampCartTop, navBottom } from '../../src/scripts/palais/cartPosition';

describe('floating cart position', () => {
  it('never goes above the site navigation or below the screen', () => {
    expect(clampCartTop(0, 120, 460, 64)).toBe(64);      // saved at the very top: pushed below the nav
    expect(clampCartTop(10, 120, 460, 64)).toBe(64);
    expect(clampCartTop(200, 120, 460, 64)).toBe(200);
    expect(clampCartTop(900, 120, 460, 64)).toBe(340);   // bottom edge = viewport - height
  });
  it('still fits when the screen is shorter than nav + cart', () => {
    expect(clampCartTop(50, 300, 320, 64)).toBe(20);     // viewport - height wins over the nav limit; nothing negative
    expect(clampCartTop(50, 400, 320, 64)).toBe(0);
  });
  it('reserves the nav only while it is on screen', () => {
    expect(navBottom({ getBoundingClientRect: () => ({ bottom: 84 }) } as any)).toBe(90);
    expect(navBottom({ getBoundingClientRect: () => ({ bottom: -40 }) } as any)).toBe(0); // scrolled away
    expect(navBottom(null)).toBe(0);
  });
  it('is used for dragging, restoring and expanding the cart on the group page', () => {
    const page = readFileSync('src/pages/palais/group.astro', 'utf8');
    expect(page).toContain('clampCartTop(');
    expect(page).not.toContain('Math.min(Math.max(0, top), maxTop)');
    expect(page).toMatch(/addEventListener\('resize'[\s\S]{0,200}applyCartTop\(/); // rotating the phone re-clamps
  });
});

import { cartFit } from '../../src/scripts/palais/cartPosition';

describe('cart keeps every person in one row by shrinking them', () => {
  // each person advances 100px × scale and the last is 200px wide: n people need 100 × (n + 1) × scale, plus 24px of padding
  it('does not shrink while they fit', () => {
    expect(cartFit(3, 1000, 1)).toBe(1);     // needs 400 + 24
    expect(cartFit(8, 1000, 1)).toBe(1);     // needs 900 + 24
  });
  it('shrinks just enough for a ninth person on a narrow screen', () => {
    expect(cartFit(9, 800, 1)).toBeCloseTo((800 - 24) / 1000, 5);
    expect(cartFit(4, 300, 1)).toBeCloseTo((300 - 24) / 500, 5);   // a phone in portrait: the fourth person is allowed
  });
  it('accounts for the current media scale (the landscape-phone 0.32 or the zoom)', () => {
    expect(cartFit(4, 300, 0.32)).toBe(1);   // 160 + 24 fits already
    expect(cartFit(12, 300, 0.32)).toBeCloseTo((300 - 24) / (100 * 13 * 0.32), 5);
  });
  it('never collapses to nothing', () => {
    expect(cartFit(300, 200, 1)).toBeGreaterThanOrEqual(0.05);
    expect(cartFit(0, 500, 1)).toBe(1);
  });
  it('replaces the old reject-when-full rule on the page', () => {
    const page = readFileSync('src/pages/palais/group.astro', 'utf8');
    expect(page).not.toContain('items.scrollWidth > items.clientWidth');
    expect(page).toContain('cartFit(');
    expect(page).toContain('--cart-fit');
  });
});
