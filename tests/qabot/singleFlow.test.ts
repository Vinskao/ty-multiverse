import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const bot = readFileSync('src/components/QABot.astro', 'utf8');

describe('one chat flow', () => {
    it('does not let the header title switch the chat to Maya v2', () => {
        expect(bot).not.toContain('切換到 Maya v2');
        expect(bot).not.toMatch(/current === "v2" \? "v1" : "v2"/);
    });
});
