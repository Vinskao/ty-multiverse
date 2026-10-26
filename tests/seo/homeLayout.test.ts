import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
describe('homepage responsive presentation', () => {
    it('presents maintenance experience instead of scored skill graphics', () => {
        const home = read('src/pages/index.astro');
        expect(home).toContain('<MaintainerExperience />');
        expect(home).not.toContain('<SkillsBubbleChart');
        expect(home).not.toContain('class="hero-side"');
        const team = read('src/components/MaintainerExperience.astro');
        expect(team).toContain('產品背後的維護經驗');
        expect(team).toContain('Tianyi Kao');
        expect(team).toContain('<details');
    });
    it('keeps range controls compact on mobile', () => {
        const css = read('src/styles/index.css');
        expect(css).not.toMatch(/\.market-chart-controls button, \.market-price-comparison select\s*\{\s*min-height:44px/);
        expect(css).toMatch(/\.market-chart-controls button\s*\{[^}]*min-height:28px/s);
    });
});
