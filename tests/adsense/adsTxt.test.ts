import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AdSense ads.txt', () => {
  it('publishes the account seller record at the site root', () => {
    const adsTxt = readFileSync(resolve(process.cwd(), 'public/ads.txt'), 'utf8');

    expect(adsTxt.trim()).toBe('google.com, pub-7199302788563175, DIRECT, f08c47fec0942fa0');
  });
});
