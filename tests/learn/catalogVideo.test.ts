import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { clipExists, discoverNumberedClips, keepCatalogVideoPlaying } from '../../src/scripts/learn/catalogVideo';

describe('learn catalog looping video', () => {
  const page = readFileSync('src/pages/learn.astro', 'utf8');
  const css = readFileSync('src/styles/learn.css', 'utf8');

  it('loops walking.mp4 above the 探索學習領域 heading with no play button', () => {
    const video = page.indexOf('walking.mp4');
    expect(video).toBeGreaterThan(-1);
    expect(video).toBeLessThan(page.indexOf('<h2>探索學習領域</h2>'));
    const tag = page.slice(page.lastIndexOf('<video', video), page.indexOf('</video>', video));
    expect(tag).toContain('autoplay');
    expect(tag).not.toContain(' loop');
    expect(page).toContain('images/people/hiking.mp4');
    expect(page.indexOf('walking.mp4')).toBeLessThan(page.indexOf('hiking.mp4'));
    expect(tag).toContain('muted');
    expect(tag).toContain('playsinline');
    expect(tag).not.toContain('controls');
  });

  it('styles the video frame so it cannot be clicked', () => {
    expect(css).toContain('.learn-catalog-video');
    expect(css).toContain('pointer-events: none');
  });
});

describe('learn catalog video autoplay fallback (iOS low power mode)', () => {
  const page = readFileSync('src/pages/learn.astro', 'utf8');
  const script = readFileSync('src/scripts/learn/catalogVideo.ts', 'utf8');
  const css = readFileSync('src/styles/learn.css', 'utf8');

  it('forces muted playback and retries on the first user gesture', () => {
    expect(page).toContain('keepCatalogVideoPlaying');
    expect(script).toContain('video.muted = true');
    expect(script).toContain('video.play()');
    expect(script).toContain("'touchstart'");
    expect(script).toContain("'visibilitychange'");
  });

  it('hides the WebKit start-playback overlay', () => {
    expect(css).toContain('::-webkit-media-controls-start-playback-button');
    expect(css).toContain('::-webkit-media-controls-overlay-play-button');
  });
});


describe('walking -> hiking cross-fade playlist', () => {
  function setup(durations = [10, 8]) {
    document.body.innerHTML = '<div class="learn-catalog-video"><video></video><video></video></div>';
    const [a, b] = Array.from(document.querySelectorAll('video'));
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    [a, b].forEach((v, i) => Object.defineProperty(v, 'duration', { value: durations[i], configurable: true }));
    keepCatalogVideoPlaying(document, 1);
    return { a, b, play };
  }
  const at = (v: HTMLVideoElement, t: number) => { v.currentTime = t; v.dispatchEvent(new Event('timeupdate')); };

  it('starts hiking under walking one second before walking ends, fading walking out', () => {
    vi.useFakeTimers();
    const { a, b } = setup();
    expect(a.style.opacity).toBe('1');
    expect(b.style.opacity).toBe('0');
    at(a, 8);
    expect(b.style.opacity).toBe('0');
    at(a, 9.2);
    expect(b.style.opacity).toBe('1');
    expect(a.style.opacity).toBe('0');
    vi.advanceTimersByTime(1100);
    expect(a.currentTime).toBe(0);
    vi.useRealTimers();
  });

  it('repeats: after hiking comes walking again', () => {
    vi.useFakeTimers();
    const { a, b } = setup();
    at(a, 9.5); vi.advanceTimersByTime(1100);
    at(b, 7.5);
    expect(a.style.opacity).toBe('1');
    expect(b.style.opacity).toBe('0');
    vi.useRealTimers();
  });

  it('keeps looping walking alone when hiking.mp4 cannot be loaded', () => {
    const { a, b } = setup();
    b.dispatchEvent(new Event('error'));
    at(a, 9.5);
    expect(a.style.opacity).toBe('1');
    expect(a.currentTime).toBe(0);
  });
});


describe('walking2.mp4, walking3.mp4 ... join the playlist', () => {
  it('discovers every numbered clip that exists, even with gaps, in numeric order', async () => {
    const have = new Set(['https://x/walking2.mp4', 'https://x/walking3.mp4', 'https://x/walking5.mp4', 'https://x/walking12.mp4']);
    const urls = await discoverNumberedClips(async url => have.has(url), 'https://x/walking', 30);
    expect(urls).toEqual(['https://x/walking2.mp4', 'https://x/walking3.mp4', 'https://x/walking5.mp4', 'https://x/walking12.mp4']);
  });

  it('accepts the text/plain the image server labels mp4 files with, but not an HTML error page', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    spy.mockResolvedValueOnce(new Response(null, { status: 200, headers: { 'Content-Type': 'text/plain' } }));
    expect(await clipExists('https://x/walking2.mp4')).toBe(true);
    spy.mockResolvedValueOnce(new Response(null, { status: 200, headers: { 'Content-Type': 'text/html' } }));
    expect(await clipExists('https://x/walking3.mp4')).toBe(false);
    spy.mockResolvedValueOnce(new Response(null, { status: 404, headers: { 'Content-Type': 'text/html' } }));
    expect(await clipExists('https://x/walking4.mp4')).toBe(false);
    spy.mockRestore();
  });

  it('finds nothing (and does not throw) when probing fails', async () => {
    expect(await discoverNumberedClips(async () => { throw new Error('offline'); })).toEqual([]);
  });

  it('plays an added clip after the existing ones, then wraps around to the first', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div class="learn-catalog-video"><video></video><video></video></div>';
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const playlist = keepCatalogVideoPlaying(document, 1)!;
    playlist.add('https://x/walking2.mp4');
    const [a, b, c] = Array.from(document.querySelectorAll('video'));
    [a, b, c].forEach(v => Object.defineProperty(v, 'duration', { value: 10, configurable: true }));
    const at = (v: HTMLVideoElement, t: number) => { v.currentTime = t; v.dispatchEvent(new Event('timeupdate')); };
    at(a, 9.5); vi.advanceTimersByTime(1100);
    expect(b.style.opacity).toBe('1');
    at(b, 9.5); vi.advanceTimersByTime(1100);
    expect(c.src).toContain('walking2.mp4');
    expect(c.style.opacity).toBe('1');
    expect(b.style.opacity).toBe('0');
    at(c, 9.5);
    expect(a.style.opacity).toBe('1');
    vi.useRealTimers();
  });
});
