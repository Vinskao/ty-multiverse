// The overview videos (walking.mp4 -> hiking.mp4 -> walking.mp4 ...) play one after another and repeat,
// joined by a cross-fade: the next clip starts under the current one while the current one fades out.
// iOS (low-power mode, data saver) blocks autoplay and shows a native play button, so we force
// muted + play() and retry on the first touch / scroll / tab return.
export const CATALOG_FADE_SECONDS = 1;

export const CATALOG_CLIP_BASE = 'https://tymultiverse.cc/images/people/walking';
export const CATALOG_MAX_NUMBERED_CLIPS = 200;

/** Finds the consecutive numbered playlist (walking2.mp4 through the first missing number). */
export async function discoverNumberedClips(
  exists: (url: string) => Promise<boolean>,
  base = CATALOG_CLIP_BASE,
  max = CATALOG_MAX_NUMBERED_CLIPS,
): Promise<string[]> {
  const clips: string[] = [];
  for (let number = 2; number <= max; number += 1) {
    try {
      if (!await exists(`${base}${number}.mp4`)) break;
      clips.push(`${base}${number}.mp4`);
    } catch {
      break;
    }
  }
  return clips;
}

/** The image server labels mp4 files text/plain, so only a missing file or an HTML error page counts as absent. */
export async function clipExists(url: string): Promise<boolean> {
  const response = await fetch(url, { method: 'HEAD' });
  return response.ok && !/html/i.test(response.headers.get('Content-Type') || '');
}

export function keepCatalogVideoPlaying(root: ParentNode = document, fadeSeconds = CATALOG_FADE_SECONDS): { add(url: string): void } | undefined {
  const all = Array.from(root.querySelectorAll<HTMLVideoElement>('.learn-catalog-video video'));
  if (!all.length) return undefined;
  const container = all[0].parentElement;
  const broken = new Set<HTMLVideoElement>();
  let active = all[0];
  let fading = false;

  const prepare = (video: HTMLVideoElement, visible: boolean) => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = false;
    video.controls = false;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.style.opacity = visible ? '1' : '0';
    video.addEventListener('error', () => { broken.add(video); video.style.opacity = '0'; });
  };
  all.forEach((video, index) => prepare(video, index === 0));

  const play = (video: HTMLVideoElement) => {
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  };
  const nextPlayable = (): HTMLVideoElement => {
    const candidates = all.filter(video => video !== active && !broken.has(video));
    if (!candidates.length) return active;
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    if (candidate) return candidate;
    return active;
  };
  const advance = () => {
    if (fading) return;
    const incoming = nextPlayable();
    if (incoming === active) { active.currentTime = 0; play(active); return; } // only one clip works: plain loop
    fading = true;
    const outgoing = active;
    incoming.currentTime = 0;
    play(incoming);
    incoming.style.opacity = '1';
    outgoing.style.opacity = '0';
    active = incoming;
    setTimeout(() => {
      outgoing.pause();
      outgoing.currentTime = 0;
      fading = false;
    }, fadeSeconds * 1000);
  };

  const wire = (video: HTMLVideoElement) => {
    video.addEventListener('timeupdate', () => {
      if (video !== active || fading || !Number.isFinite(video.duration) || video.duration <= 0) return;
      if (video.duration - video.currentTime <= fadeSeconds) advance();
    });
    video.addEventListener('ended', () => { if (video === active) advance(); });
    video.addEventListener('loadeddata', () => { if (video === active && video.paused) play(video); });
    video.addEventListener('pause', () => { if (video === active && !fading && !document.hidden) play(video); });
  };
  all.forEach(wire);

  play(active);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && active.paused) play(active); });
  for (const type of ['touchstart', 'pointerdown', 'click', 'scroll', 'keydown']) {
    document.addEventListener(type, () => { if (active.paused) play(active); }, { once: true, passive: true });
  }

  return {
    add(url: string) {
      if (!container) return;
      const video = document.createElement('video');
      video.src = url;
      video.preload = 'auto';
      video.setAttribute('disablepictureinpicture', '');
      video.tabIndex = -1;
      prepare(video, false);
      wire(video);
      container.append(video);
      all.push(video);
    },
  };
}
