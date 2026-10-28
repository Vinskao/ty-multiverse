import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const flat = read('src/styles/qabot-flat.css');
const layout = read('src/layouts/BaseLayout.astro');

// 2026-10-28: the Maya chat widget kept its old gold gradients next to the flat, neutral site.
describe('chat widget matches the flat site style', () => {
  it('is loaded after the legacy widget stylesheets so it wins', () => {
    const order = ['qabotCssUrl', 'qabotv2CssUrl', 'qabotFlatCssUrl'].map(name => layout.indexOf(`href={${name}}`));
    expect(order.every(index => index > 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('restyles every surface of the widget with the site tokens, not gold', () => {
    for (const selector of ['.qa-bot-container', '.chat-header', '.bot-message .message-content', '.user-message .message-content',
      '.suggestion-btn', '.topic-suggestions h4', '.chat-input', '.send-button', '.fullscreen-button', '.close-button']) {
      expect(flat, selector).toContain(selector);
    }
    expect(flat).toMatch(/\.qa-bot-container[^{]*\{[^}]*background:\s*var\(--gray-999\)/);
    expect(flat).toMatch(/\.send-button[^{]*\{[^}]*var\(--accent-regular\)/);
    // No gold/brown palette of the old theme and no gradients.
    expect(flat).not.toMatch(/#(DAA520|B8860B|FFD700|FFA500|FFF8DC|F5DEB3|8B4513|CD853F)/i);
    expect(flat).not.toContain('linear-gradient');
  });
});
