import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('homepage social links and product identity', () => {
  it('identifies the umbrella brand and Birch Investments as its research product', () => {
    const home = source('src/pages/index.astro');
    const copy = JSON.parse(source('src/storages/i18n.json')).home;

    // 2026-10-31: parent first. TY Multiverse > TY 市場研究室 (branch) > Birch Investments (product).
    expect(copy.productBrand.zh).toBe('TY Multiverse · TY 市場研究室');
    expect(copy.productBrand.en).toBe('TY Multiverse · TY Market Lab');
    expect(copy.productName.zh).toBe('Birch Investments 樺樹資本工具');
    expect(copy.productName.en).toBe('Birch Investments');
    expect(home).toContain('data-i18n="home.productName"');
    expect(home).toContain('>TY Multiverse · TY 市場研究室<');
    expect(source('src/components/Footer.astro')).toContain('>TY Multiverse · TY 市場研究室<');
  });

  it('describes ty-multiverse-common as it is now (gRPC was removed)', () => {
    const copy = JSON.parse(source('src/storages/i18n.json'));
    const help = JSON.stringify(Object.values(copy).map((section: any) => section.commonHelp).filter(Boolean));
    expect(help).not.toMatch(/gRPC/i);
    expect(source('src/components/OpenSourceProjects.astro')).not.toMatch(/gRPC/i);
  });

  it('links the shared social entry points to Instagram, Threads, and the Facebook Page', () => {
    const links = source('src/scripts/socialLinks.ts');
    expect(links).toContain("https://www.instagram.com/birch_investments/");
    expect(links).toContain("https://www.threads.com/@birch_investments");
    expect(links).toContain("https://www.facebook.com/profile.php?id=61596064529255");
    expect(links).not.toContain('https://twitter.com/wawiking');
    expect(source('src/components/Nav.astro')).toContain("from '../scripts/socialLinks'");
    expect(source('src/components/Footer.astro')).toContain("from '../scripts/socialLinks'");
  });
});
