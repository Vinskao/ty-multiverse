import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { clipExists, discoverNumberedClips, discoverRestrictedClips, keepCatalogVideoPlaying } from '../../src/scripts/learn/catalogVideo';

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


describe('walking2.mp4 through the final consecutive numbered clip join the playlist', () => {
  it('stops at the first missing clip', async () => {
    const have = new Set(['https://x/walking2.mp4', 'https://x/walking3.mp4', 'https://x/walking5.mp4', 'https://x/walking12.mp4']);
    const urls = await discoverNumberedClips(async url => have.has(url), 'https://x/walking', 30);
    expect(urls).toEqual(['https://x/walking2.mp4', 'https://x/walking3.mp4']);
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

  it('randomly plays an added clip without immediately repeating the active one', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div class="learn-catalog-video"><video></video><video></video></div>';
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const playlist = keepCatalogVideoPlaying(document, 1)!;
    playlist.add('https://x/walking2.mp4');
    const [a, b, c] = Array.from(document.querySelectorAll('video'));
    [a, b, c].forEach(v => Object.defineProperty(v, 'duration', { value: 10, configurable: true }));
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const at = (v: HTMLVideoElement, t: number) => { v.currentTime = t; v.dispatchEvent(new Event('timeupdate')); };
    at(a, 9.5); vi.advanceTimersByTime(1100);
    expect(b.style.opacity).toBe('1');
    at(b, 9.5); vi.advanceTimersByTime(1100);
    expect(a.style.opacity).toBe('1');
    expect(b.style.opacity).toBe('0');
    random.mockRestore();
    vi.useRealTimers();
  });
});

describe('catalog clips stop at the first missing number and play randomly', () => {
  it('discovers clips only through the last consecutive numbered clip', async () => {
    const checked: string[] = [];
    const urls = await discoverNumberedClips(async url => {
      checked.push(url);
      return url.endsWith('walking2.mp4') || url.endsWith('walking3.mp4') || url.endsWith('walking4.mp4') || url.endsWith('walking7.mp4');
    }, 'https://x/walking', 30);

    expect(urls).toEqual(['https://x/walking2.mp4', 'https://x/walking3.mp4', 'https://x/walking4.mp4']);
    expect(checked).toEqual(['https://x/walking2.mp4', 'https://x/walking3.mp4', 'https://x/walking4.mp4', 'https://x/walking5.mp4']);
  });

  it('checks all numbered clips through walking200 when the full sequence exists', async () => {
    const checked: string[] = [];
    const urls = await discoverNumberedClips(async url => { checked.push(url); return true; });
    expect(urls).toHaveLength(199);
    expect(checked.at(-1)).toBe('https://tymultiverse.cc/images/people/walking200.mp4');
  });

  it('selects a random next clip without immediately replaying the active clip', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div class="learn-catalog-video"><video></video><video></video><video></video><video></video></div>';
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const videos = Array.from(document.querySelectorAll('video'));
    videos.forEach(video => Object.defineProperty(video, 'duration', { value: 10, configurable: true }));
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    keepCatalogVideoPlaying(document, 1);
    videos[0].currentTime = 9.5;
    videos[0].dispatchEvent(new Event('timeupdate'));
    expect(videos[0].style.opacity).toBe('0');
    expect(videos[1].style.opacity).toBe('1');
    vi.advanceTimersByTime(1100);
    random.mockRestore();
    vi.useRealTimers();
  });
});

describe('catalog videos follow the same login rule as 每日市場精讀', () => {
  const page = readFileSync('src/pages/learn.astro', 'utf8');
  const css = readFileSync('src/styles/learn.css', 'utf8');

  it('starts cropped and is switched to full by the shared presenter-access check', () => {
    expect(page).toMatch(/class="learn-catalog-video"[^>]*data-full="false"/);
    expect(page).toMatch(/querySelectorAll<HTMLElement>\('\.presenter-frame, \.learn-catalog-video'\)/);
  });

  it('crops to the top two fifths when not full and shows the whole frame when full', () => {
    expect(css).toMatch(/\.learn-catalog-video\[data-full="false"\]\s*\{[^}]*aspect-ratio:\s*832\s*\/\s*217\.6/);
    expect(css).toMatch(/\.learn-catalog-video\[data-full="false"\] video[^{]*\{[^}]*top:\s*0/);
  });
});

describe('prison.mp4 series needs permission to play', () => {
  it('discovers prison.mp4, prison2.mp4 ... through the first gap', async () => {
    const have = new Set(['https://x/prison.mp4', 'https://x/prison2.mp4', 'https://x/prison4.mp4']);
    expect(await discoverRestrictedClips(async url => have.has(url), 'https://x/prison', 30))
      .toEqual(['https://x/prison.mp4', 'https://x/prison2.mp4']);
  });

  it('keeps restricted clips out of the rotation unless data-full is true', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div class="learn-catalog-video" data-full="false"><video></video></div>';
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const playlist = keepCatalogVideoPlaying(document, 1)!;
    playlist.add('https://x/prison.mp4', { restricted: true });
    const [a, p] = Array.from(document.querySelectorAll('video'));
    [a, p].forEach(v => Object.defineProperty(v, 'duration', { value: 10, configurable: true }));
    const at = (v: HTMLVideoElement, t: number) => { v.currentTime = t; v.dispatchEvent(new Event('timeupdate')); };
    at(a, 9.5); vi.advanceTimersByTime(1100);
    expect(p.style.opacity).toBe('0');
    expect(a.style.opacity).toBe('1');
    (document.querySelector('.learn-catalog-video') as HTMLElement).dataset.full = 'true';
    at(a, 9.5); vi.advanceTimersByTime(1100);
    expect(p.style.opacity).toBe('1');
    vi.useRealTimers();
  });
});
