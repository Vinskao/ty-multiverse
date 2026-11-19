import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const platform = readFileSync('src/components/QAPlatform.astro', 'utf8');
const bot = readFileSync('src/components/QABot.astro', 'utf8');

describe('chat panel Messenger link', () => {
    it('links to the Page Messenger in a new tab and switches language with the chat', () => {
        expect(platform).toMatch(/id="messengerLink"[^>]*href="https:\/\/m\.me\/61596064529255"/);
        expect(platform).toMatch(/rel="noopener noreferrer"/);
        expect(bot).toContain('Or leave us a message on Messenger');
        expect(bot).toContain('或在 Messenger 留言給我們');
    });
});
