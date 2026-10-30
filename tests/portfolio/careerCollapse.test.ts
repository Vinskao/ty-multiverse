import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('career briefing', () => {
  it('places the briefing inside a closed native disclosure', () => {
    const page = readFileSync('src/pages/about.astro', 'utf8');
    expect(page).toMatch(/<details class="career-overview">[\s\S]*?<summary>[\s\S]*?職涯概覽[\s\S]*?<Briefing showTitle=\{false\} \/>[\s\S]*?<\/details>/);
  });
});
