import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { BUSINESS_SUFFIX, peopleImageUrl, resolveImageUrl } from '../../src/scripts/palais/businessImage';

const BASE = 'https://img.example/images/people';

describe('business image url', () => {
  it('uses ${name}Business.png for the business version', () => {
    expect(BUSINESS_SUFFIX).toBe('Business');
    expect(peopleImageUrl(BASE, 'Wavo', '123', true)).toBe(`${BASE}/WavoBusiness.png?t=123`);
  });

  it('uses the original ${name}.png otherwise', () => {
    expect(peopleImageUrl(BASE, 'Wavo', '123', false)).toBe(`${BASE}/Wavo.png?t=123`);
  });

  it('encodes the name like the page does for the original image', () => {
    expect(peopleImageUrl(BASE, '王 小明', '1', true)).toBe(`${BASE}/${encodeURIComponent('王 小明Business')}.png?t=1`);
  });
});

describe('resolveImageUrl (business with fallback to the original)', () => {
  it('returns the business image when it exists', async () => {
    const exists = vi.fn(async () => true);
    const url = await resolveImageUrl({ base: BASE, name: 'Wavo', timestamp: '1', business: true, exists });
    expect(url).toBe(`${BASE}/WavoBusiness.png?t=1`);
    expect(exists).toHaveBeenCalledWith(`${BASE}/WavoBusiness.png?t=1`);
  });

  it('falls back to the original image when the business image does not exist', async () => {
    const url = await resolveImageUrl({ base: BASE, name: 'Wavo', timestamp: '1', business: true, exists: async () => false });
    expect(url).toBe(`${BASE}/Wavo.png?t=1`);
  });

  it('falls back to the original image when the existence check itself fails', async () => {
    const url = await resolveImageUrl({
      base: BASE, name: 'Wavo', timestamp: '1', business: true,
      exists: async () => { throw new Error('network'); },
    });
    expect(url).toBe(`${BASE}/Wavo.png?t=1`);
  });

  it('does not even look for the business image when business mode is off', async () => {
    const exists = vi.fn(async () => true);
    const url = await resolveImageUrl({ base: BASE, name: 'Wavo', timestamp: '1', business: false, exists });
    expect(url).toBe(`${BASE}/Wavo.png?t=1`);
    expect(exists).not.toHaveBeenCalled();
  });
});

describe('group page basket business button', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/pages/palais/group.astro'), 'utf8');

  it('has a 商務 toggle button in the basket header', () => {
    expect(page).toMatch(/id="cart-business"[^>]*aria-pressed="false"[^>]*>商務</);
    expect(page).toMatch(/#palais-cart\.minimized #cart-business/);
  });

  it('never points a card image at a business url that may be missing (its onerror deletes the card)', () => {
    expect(page).toContain("from '../../scripts/palais/businessImage'");
    expect(page).toContain('resolveImageUrl(');
  });

  it('uses the business image (with fallback) for the basket download too', () => {
    const fn = page.slice(page.indexOf('async function downloadCartRow'));
    expect(fn).toContain('resolveImageUrl(');
    expect(fn).not.toMatch(/fetch\(`\$\{PEOPLE_IMAGE_URL\}\/\$\{encodeURIComponent\(name\)\}\.png/);
  });
});
