import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import english from '../../src/storages/literalEn.json';

const platform = readFileSync('src/components/QAPlatform.astro', 'utf8');
const css = readFileSync('src/styles/qabot-flat.css', 'utf8');

describe('Messenger icon in the chat header', () => {
    it('is an icon link in the header controls, opens the Page Messenger in a new tab and has an English title', () => {
        const header = platform.match(/<div class="header-controls">([\s\S]*?)<div class="chat-messages"/)?.[1] ?? '';
        expect(header).toMatch(/<a class="messenger-icon-button"[^>]*href="https:\/\/m\.me\/61596064529255"[^>]*rel="noopener noreferrer"[^>]*>\s*<svg/);
        expect(header.indexOf('messenger-icon-button')).toBeLessThan(header.indexOf('fullscreen-button'));
        expect(english['用 Messenger 聯絡真人']).toBe('Contact us on Messenger');
        expect(css).toContain('.messenger-icon-button');
    });
});
