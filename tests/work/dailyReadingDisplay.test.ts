import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('daily reading article', () => {
  it('does not repeat the truncated generated summary above the full article', () => {
    const page = readFileSync('src/pages/work/[...slug].astro', 'utf8');
    expect(page).toContain("!article.tags.includes('Daily Reading')");
  });
});
