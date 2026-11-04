import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { marketAudioDateTime } from '../../src/scripts/learn/marketAudioPresentation';

describe('market audio presentation', () => {
  it('formats the audio creation timestamp in Taipei time for Chinese and English', () => {
    const value = '2026-11-04T01:05:00Z';
    expect(marketAudioDateTime(value, 'zh')).toBe('2026年11月4日 09:05（台北時間）');
    expect(marketAudioDateTime(value, 'en')).toBe('Nov 4, 2026, 9:05 AM (Taipei time)');
  });

  it.each([undefined, '', 'not-a-date'])('omits missing or invalid timestamps (%s)', value => {
    expect(marketAudioDateTime(value, 'zh')).toBeNull();
  });

  it('does not put UUID or revision into the audio card heading', () => {
    const page = readFileSync(resolve(__dirname, '../../src/pages/learn.astro'), 'utf8');
    expect(page).toContain('marketAudioDateTime');
    expect(page).not.toMatch(/title\.textContent\s*=\s*`\$\{label\}\s+\$\{item\.code\}/);
    expect(page).not.toMatch(/第\s*\$\{item\.revision\}\s*版/);
  });

  it('uses a single-column catalogue for the audio view layout', () => {
    const css = readFileSync(resolve(__dirname, '../../src/styles/learn.css'), 'utf8');
    expect(css).toContain('.learn-audio-view .learn-catalog { display: block; }');
    expect(css).not.toContain('.market-audio-view .learn-catalog');
  });
});
