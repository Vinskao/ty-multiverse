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
