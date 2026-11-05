import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { marketAudioDateTime, marketAudioDay, latestTestAudioRevisions } from '../../src/scripts/learn/marketAudioPresentation';

describe('market audio presentation', () => {
  it('shows the original report date without inventing a creation time', () => {
    expect(marketAudioDay('2026-11-03', 'zh')).toBe('2026年11月3日（台北時間）');
  });
  it('shows the newest revision of each test recording and keeps all ordinary recordings', () => {
    const recordings = [
      { productType: 'daily', code: 'demo', revision: 2, voice: 'test:duo' },
      { productType: 'daily', code: 'ordinary', revision: 2, voice: 'voice' },
      { productType: 'daily', code: 'demo', revision: 1, voice: 'test:duo' },
      { productType: 'daily', code: 'ordinary', revision: 1, voice: 'voice' },
    ];
    expect(latestTestAudioRevisions(recordings)).toEqual([recordings[0], recordings[1], recordings[3]]);
  });
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

  it('gives every presenter the same video height and scales narrower sources proportionally', () => {
    const css = readFileSync(resolve(__dirname, '../../src/styles/learn.css'), 'utf8');
    expect(css).toMatch(/\.presenter-frame\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
    expect(css).toMatch(/\.market-audio-media \.presenter-frame video\s*\{[^}]*height:\s*100%[^}]*object-fit:\s*contain/);
    expect(css).not.toContain('aspect-ratio: var(--presenter-half-ratio');
  });
});
