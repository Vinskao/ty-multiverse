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
