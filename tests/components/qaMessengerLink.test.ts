import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import english from '../../src/storages/literalEn.json';

const platform = readFileSync('src/components/QAPlatform.astro', 'utf8');

describe('chat panel Messenger link', () => {
    it('links to the Page Messenger in a new tab and has an English label in the site dictionary', () => {
        expect(platform).toMatch(/id="messengerLink"[^>]*href="https:\/\/m\.me\/61596064529255"/);
        expect(platform).toMatch(/rel="noopener noreferrer"/);
        expect(english['或在 Messenger 留言給我們']).toBe('Or leave us a message on Messenger');
    });
});
