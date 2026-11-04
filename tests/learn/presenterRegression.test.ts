import { describe, it, expect } from 'vitest';
import { marketClipUrl } from '../../src/scripts/learn/marketAudioPlayback';
import { readFileSync } from 'node:fs';

describe('presenter regression', () => {
  it('selects the numbered clips in the requested order even without server settings', () => {
    expect(Array.from({ length: 9 }, (_, i) => marketClipUrl(i))).toEqual([1,2,3,1,4,5,1,6,7].map(n => `https://tymultiverse.cc/images/people/reporter${n === 1 ? '' : n}.mp4`));
  });
  it('constrains the cropped frame and keeps controls below it', () => {
    const css = readFileSync('src/styles/learn.css', 'utf8');
    expect(css).toMatch(/\.presenter-frame\[data-full="false"\] video\s*\{[^}]*position:\s*absolute/);
    expect(css).toMatch(/\.market-audio-card audio\s*\{[^}]*margin-top:/);
  });
});
