import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('learn catalog looping video', () => {
  const page = readFileSync('src/pages/learn.astro', 'utf8');
  const css = readFileSync('src/styles/learn.css', 'utf8');

  it('loops walking.mp4 above the 探索學習領域 heading with no play button', () => {
    const video = page.indexOf('walking.mp4');
    expect(video).toBeGreaterThan(-1);
    expect(video).toBeLessThan(page.indexOf('<h2>探索學習領域</h2>'));
    const tag = page.slice(page.lastIndexOf('<video', video), page.indexOf('</video>', video));
    expect(tag).toContain('autoplay');
    expect(tag).toContain('loop');
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
