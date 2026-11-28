/** Where the floating cart may sit: below the site navigation (while it is on screen) and above the bottom edge. */
export const NAV_GAP = 6;

/** Space to keep clear at the top: the navigation's bottom edge plus a small gap, or 0 once it has scrolled away. */
export function navBottom(nav: { getBoundingClientRect(): { bottom: number } } | null): number {
  const bottom = nav?.getBoundingClientRect().bottom ?? 0;
  return bottom > 0 ? Math.ceil(bottom) + NAV_GAP : 0;
}

/** Clamps a top offset into [minTop, viewport - height]; on a screen too short for both, the bottom limit wins. */
export function clampCartTop(top: number, height: number, viewport: number, minTop: number): number {
  const maxTop = Math.max(0, viewport - height);
  return Math.min(Math.max(minTop, top), maxTop);
}

const CART_PADDING_PX = 24;
const MIN_FIT = 0.05;

/**
 * Multiplier (≤ 1) that keeps `count` people in one row. A person advances 100px × scale and the last one is 200px wide,
 * so the row needs 100 × (count + 1) × scale plus the padding; when that is wider than the cart, everyone shrinks to fit.
 */
export function cartFit(count: number, width: number, scale: number): number {
  if (count < 1 || scale <= 0) return 1;
  const needed = 100 * (count + 1) * scale;
  return Math.min(1, Math.max(MIN_FIT, (width - CART_PADDING_PX) / needed));
}
