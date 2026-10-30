import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// 2026-10-30: the bottom-left AI button reloaded (avatar, state) on every page change because the site uses
// Astro's ClientRouter and the widget DOM was recreated with each page. Persisting it keeps one instance alive.
describe('AI chat widget across page changes', () => {
  const platform = readFileSync('src/components/QAPlatform.astro', 'utf8');

  it('persists the toggle, the chat window, the image modal and the loading box through navigation', () => {
    for (const id of ['qaBotToggle', 'qaBotContainer', 'imageModal', 'loadingMessage']) {
      expect(platform, id).toMatch(new RegExp(`id="${id}"[^>]*transition:persist="[a-z-]+"|transition:persist="[a-z-]+"[^>]*id="${id}"`));
    }
  });

  it('uses a distinct persist name for each element', () => {
    const names = [...platform.matchAll(/transition:persist="([^"]+)"/g)].map(m => m[1]);
    expect(names.length).toBeGreaterThanOrEqual(4);
    expect(new Set(names).size).toBe(names.length);
  });

  it('still skips re-initialising when the DOM is the same one, so persisted listeners are not doubled', () => {
    const bot = readFileSync('src/components/QABot.astro', 'utf8');
    expect(bot).toContain('sameDom');
    const v2 = readFileSync('src/components/QABotV2.astro', 'utf8');
    expect(v2).toContain('sameDom');
  });
});
