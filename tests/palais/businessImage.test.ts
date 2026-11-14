import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { BUSINESS_SUFFIX, HIKING_SUFFIX, peopleImageUrl, resolveImageUrl } from '../../src/scripts/palais/businessImage';

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

describe('hiking ("越野") image variant', () => {
  it('uses ${name}Hiking.png for the hiking version', () => {
    expect(HIKING_SUFFIX).toBe('Hiking');
    expect(peopleImageUrl(BASE, 'Wavo', '123', 'hiking')).toBe(`${BASE}/WavoHiking.png?t=123`);
  });

  it('keeps boolean true meaning the business version', () => {
    expect(peopleImageUrl(BASE, 'Wavo', '1', true)).toBe(`${BASE}/WavoBusiness.png?t=1`);
    expect(peopleImageUrl(BASE, 'Wavo', '1', null)).toBe(`${BASE}/Wavo.png?t=1`);
  });

  it('returns the hiking image when it exists and falls back to the original when it does not', async () => {
    const found = await resolveImageUrl({ base: BASE, name: 'Wavo', timestamp: '1', variant: 'hiking', exists: async () => true });
    expect(found).toBe(`${BASE}/WavoHiking.png?t=1`);
    const missing = await resolveImageUrl({ base: BASE, name: 'Wavo', timestamp: '1', variant: 'hiking', exists: async () => false });
    expect(missing).toBe(`${BASE}/Wavo.png?t=1`);
    const failing = await resolveImageUrl({
      base: BASE, name: 'Wavo', timestamp: '1', variant: 'hiking',
      exists: async () => { throw new Error('network'); },
    });
    expect(failing).toBe(`${BASE}/Wavo.png?t=1`);
  });

  it('does not look for variants when none is selected', async () => {
    const exists = vi.fn(async () => true);
    expect(await resolveImageUrl({ base: BASE, name: 'Wavo', timestamp: '1', variant: null, exists })).toBe(`${BASE}/Wavo.png?t=1`);
    expect(exists).not.toHaveBeenCalled();
  });
});

describe('group page basket hiking button', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/pages/palais/group.astro'), 'utf8');

  it('has a 越野 toggle next to 商務, hidden when the basket is minimized, with a lit state', () => {
    expect(page).toMatch(/id="cart-hiking"[^>]*aria-pressed="false"[^>]*>越野</);
    expect(page.indexOf('id="cart-business"')).toBeLessThan(page.indexOf('id="cart-hiking"'));
    expect(page.indexOf('id="cart-hiking"')).toBeLessThan(page.indexOf('id="cart-download"'));
    expect(page).toMatch(/#palais-cart\.minimized #cart-hiking/);
    expect(page).toMatch(/#cart-hiking\[aria-pressed="true"\]/);
  });

  it('makes 商務 and 越野 mutually exclusive and remembers the choice', () => {
    expect(page).toContain("'palais-cart-hiking'");
    expect(page).toMatch(/getElementById\('cart-hiking'\)\?\.addEventListener\('click'/);
    const click = page.slice(page.indexOf("getElementById('cart-business')?.addEventListener"), page.indexOf('applyVariantMode();', page.indexOf("getElementById('cart-hiking')?.addEventListener")));
    expect(click).toContain("'business'");
    expect(click).toContain("'hiking'");
    expect(page).toContain('if (cartVariant !== kind) { cartVariant = kind; cartSetIndex = 1; }');
  });

  it('uses the selected variant for the basket download too', () => {
    const fn = page.slice(page.indexOf('async function downloadCartRow'));
    expect(fn).toMatch(/variant: cartVariant/);
  });
});

describe('numbered sets (nameBusiness, nameBusiness2, ...)', () => {
  it('numbers sets from 2 and keeps set 1 unnumbered', () => {
    expect(peopleImageUrl(BASE, 'Wavo', '1', 'business', 1)).toBe(`${BASE}/WavoBusiness.png?t=1`);
    expect(peopleImageUrl(BASE, 'Wavo', '1', 'business', 2)).toBe(`${BASE}/WavoBusiness2.png?t=1`);
    expect(peopleImageUrl(BASE, 'Wavo', '1', 'hiking', 3)).toBe(`${BASE}/WavoHiking3.png?t=1`);
  });
});

describe('resolveImageUrl with a set number', () => {
  it('stays on the highest set the character has when the requested one is missing', async () => {
    const have = new Set([`${BASE}/WavoBusiness.png?t=1`]);
    const url = await resolveImageUrl({ base: BASE, name: 'Wavo', timestamp: '1', variant: 'business', index: 3, exists: async (u) => have.has(u) });
    expect(url).toBe(`${BASE}/WavoBusiness.png?t=1`);
  });
  it('uses the exact set when present', async () => {
    const url = await resolveImageUrl({ base: BASE, name: 'Wavo', timestamp: '1', variant: 'business', index: 2, exists: async () => true });
    expect(url).toBe(`${BASE}/WavoBusiness2.png?t=1`);
  });
});
