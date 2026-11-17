import { describe, expect, it } from 'vitest';
import { initPageLoading } from '../../src/scripts/pageLoading';

// 2026-11-17: the server is slow, so a tab/page switch must show a spinner immediately (Astro ClientRouter events).
const setup = () => {
  const target = new EventTarget();
  const classes = new Set<string>();
  const root = { classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } };
  initPageLoading(target, root);
  return { fire: (name: string) => target.dispatchEvent(new Event(name)), classes };
};

describe('page loading indicator', () => {
  it('shows when navigation starts and hides after the new page loads', () => {
    const { fire, classes } = setup();
    fire('astro:before-preparation');
    expect(classes.has('page-loading')).toBe(true);
    fire('astro:page-load');
    expect(classes.has('page-loading')).toBe(false);
  });

  it('is cleared if the swap happens without a page-load event', () => {
    const { fire, classes } = setup();
    fire('astro:before-preparation');
    fire('astro:after-swap');
    expect(classes.has('page-loading')).toBe(false);
  });
});
