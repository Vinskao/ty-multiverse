// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { initSocialDropdown } from '../../src/scripts/navigation/socialDropdown';

const root = process.cwd().endsWith('ty-multiverse-frontend') ? process.cwd() : resolve(process.cwd(), 'ty-multiverse-frontend');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('navbar social media popover', () => {
  it('replaces the exposed 6 social icons in navbar with a single toggle button and popover', () => {
    const nav = source('src/components/Nav.astro');
    expect(nav).toContain('class="social-dropdown"');
    expect(nav).toContain('class="social-toggle-btn"');
    expect(nav).toContain('id="socialToggleBtn"');
    expect(nav).toContain('id="social-popover"');
    expect(nav).toContain('icon="share-network"');
    expect(nav).toContain('aria-haspopup="true"');
  });

  it('contains the share-network icon path in IconPaths.ts', () => {
    const icons = source('src/components/IconPaths.ts');
    expect(icons).toContain("'share-network'");
  });

  it('styles the social toggle button and popover in nav.css', () => {
    const css = source('src/styles/nav.css');
    expect(css).toMatch(/\.social-toggle-btn/);
    expect(css).toMatch(/\.social-popover/);
    expect(css).toMatch(/\.social-dropdown/);
    expect(css).toMatch(/\.social-popover\s*\.socials/);
  });

  it('toggles the popover open on click and closes on outside click or Escape', () => {
    document.body.innerHTML = `
      <div class="social-dropdown">
        <button type="button" class="social-toggle-btn" id="socialToggleBtn" aria-expanded="false" aria-haspopup="true" aria-controls="social-popover">
          <span>Social</span>
        </button>
        <div id="social-popover" class="social-popover" hidden>
          <div class="socials">
            <a href="https://instagram.com" class="social">Instagram</a>
            <a href="https://threads.com" class="social">Threads</a>
          </div>
        </div>
      </div>
      <div id="outside">Outside</div>
    `;

    const cleanup = initSocialDropdown(document.body);
    const btn = document.getElementById('socialToggleBtn') as HTMLButtonElement;
    const popover = document.getElementById('social-popover') as HTMLElement;
    const outside = document.getElementById('outside') as HTMLElement;

    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(popover.hidden).toBe(true);

    // Click to open
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(popover.hidden).toBe(false);

    // Click to close
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(popover.hidden).toBe(true);

    // Open again, then click outside
    btn.click();
    expect(popover.hidden).toBe(false);
    outside.click();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(popover.hidden).toBe(true);

    // Open again, then press Escape
    btn.click();
    expect(popover.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(popover.hidden).toBe(true);

    cleanup?.();
  });
});
