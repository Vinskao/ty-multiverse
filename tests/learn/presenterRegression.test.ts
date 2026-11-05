import { describe, it, expect, vi } from 'vitest';
import { bindMarketAudioPlayback, marketClipUrl } from '../../src/scripts/learn/marketAudioPlayback';
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
  it('waits for the active clip dimensions and updates cropping on clip changes', () => {
    const list = document.createElement('div');
    const frame = document.createElement('div'); frame.className = 'presenter-frame';
    const audio = document.createElement('audio');
    const video = document.createElement('video'); frame.append(video); list.append(audio, frame);
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 400 });
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 800 });
    bindMarketAudioPlayback(list, audio, video);
    expect(frame.dataset.metadataReady).toBe('false');
    video.dispatchEvent(new Event('loadedmetadata'));
    expect(frame.dataset.metadataReady).toBe('true');
    expect(frame.style.getPropertyValue('--presenter-half-ratio')).toBe('400 / 400');
    const next = frame.querySelectorAll('video')[1];
    Object.defineProperty(next, 'videoWidth', { configurable: true, value: 900 });
    Object.defineProperty(next, 'videoHeight', { configurable: true, value: 600 });
    next.dispatchEvent(new Event('loadedmetadata'));
    expect(frame.style.getPropertyValue('--presenter-half-ratio')).toBe('400 / 400');
    const play = vi.spyOn(video, 'play').mockResolvedValue();
    const paused = vi.spyOn(audio, 'paused', 'get').mockReturnValue(false);
    audio.dispatchEvent(new Event('playing'));
    next.dispatchEvent(new Event('playing'));
    expect(frame.style.getPropertyValue('--presenter-half-ratio')).toBe('900 / 300');
    play.mockRestore(); paused.mockRestore();
  });
  it('hides video and poster before dimensions are known for restricted viewers', () => {
    const css = readFileSync('src/styles/learn.css', 'utf8');
    expect(css).toMatch(/\.presenter-frame\[data-full="false"\]\[data-metadata-ready="false"\]/);
    expect(css).toMatch(/\.presenter-frame\[data-full="false"\]\[data-metadata-ready="false"\] video/);
  });
});
