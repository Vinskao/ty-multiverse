import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('palais group page: touch drag wiring', () => {
  const page = readFileSync('src/pages/palais/group.astro', 'utf8');

  it('enables long-press touch dragging for the character cards', () => {
    expect(page).toContain("from '../../scripts/palais/touchDrag'");
    expect(page).toMatch(/enableTouchDrag\(\{[^}]*cardSelector: '\.pg-draggable'/s);
    expect(page).toMatch(/initCart\(\);\s*initTouchDrag\(\);/);
  });

  it('sends a touch drop to the cart, a same-row reorder, or an army', () => {
    const fn = page.slice(page.indexOf('function dropCardAt'), page.indexOf('function initTouchDrag'));
    expect(fn).toContain("closest('#palais-cart')");
    expect(fn).toContain('moveCardToCart(card)');
    expect(fn).toContain('reorderCard(card, targetCard, clientX)');
    expect(fn).toContain('moveCardToArmy(card, army)');
    expect(fn.indexOf('moveCardToCart')).toBeLessThan(fn.indexOf('reorderCard'));
  });

  it('shares the reorder logic with the desktop HTML5 drop and hides the iOS image callout', () => {
    expect(page).toContain('reorderCard(draggedCard, characterContainer, e.clientX)');
    expect(page).toContain('-webkit-touch-callout: none');
  });

  it('does not hijack scrolling: long hold, and a press that never moves is not a move', () => {
    const call = page.slice(page.indexOf('function initTouchDrag'), page.indexOf('function initCart'));
    expect(call).toMatch(/holdMs:\s*(5\d\d|[6-9]\d\d)/);
    expect(page).toContain('army && !army.contains(card)');
  });
});
