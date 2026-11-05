import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('About founder, story and future team', () => {
  const page = readFileSync('src/pages/about.astro', 'utf8');
  it('presents a product journey and a founder video near the top', () => {
    expect(page).toContain('TY Multiverse 的旅程');
    expect(page).toContain('創辦人的話');
    expect(page).toContain('founder-message.mp4');
    expect(page).toContain('preload="auto"');
    expect(page).toContain('lang === "zh" ? "播放影片" : "Play video"');
    expect(page).toContain('<svg aria-hidden="true"');
    expect(page).not.toContain('"????"');
    expect(page).not.toContain('aria-hidden="true">?</span>');
    expect(page.indexOf('founder-message.mp4')).toBeLessThan(page.indexOf('class="team-section"'));
    expect(page).not.toContain('KTY 的旅程');
  });
  it('keeps the personal experience figures in the founder panel', () => {
    const founder = page.indexOf('<article class="team-member"');
    expect(page.indexOf('class="exp-badges"')).toBeGreaterThan(founder);
    expect(page.indexOf('class="exp-badges"')).toBeLessThan(page.indexOf('</article>', founder));
    for (const label of ['開發經驗', '專案管理經驗', '金融經驗', '總工作經驗']) expect(page).toContain(label);
  });
  it('invites leadership and marketing talent without framing a one-person team as the goal', () => {
    expect(page).not.toContain('一人打造、一人營運');
    expect(page).not.toContain('Built and run by one person.');
    expect(page).toContain('CEO');
    expect(page).toContain('行銷');
    expect(page).toContain('mailto:tianyikao@tymultiverse.cc');
    expect(page.indexOf('class="team-recruitment"')).toBeGreaterThan(page.indexOf('class="team-section"'));
  });
});
