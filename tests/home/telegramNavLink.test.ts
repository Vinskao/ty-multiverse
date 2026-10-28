import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const nav = readFileSync(resolve(process.cwd(), 'src/components/Nav.astro'), 'utf8');

it('links the navigation controls to the Telegram AI bot without the obsolete reset control', () => {
    expect(nav).toContain('https://web.telegram.org/a/#8834550900');
    expect(nav).toContain('aria-label="Open Telegram AI bot"');
    expect(nav).not.toContain('reset-website-btn');
    expect(nav).not.toContain('initResetBtn');
});
