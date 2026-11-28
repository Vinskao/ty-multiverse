// The overview videos (walking.mp4 -> hiking.mp4 -> walking.mp4 ...) play one after another and repeat,
// joined by a cross-fade: the next clip starts under the current one while the current one fades out.
// iOS (low-power mode, data saver) blocks autoplay and shows a native play button, so we force
// muted + play() and retry on the first touch / scroll / tab return.
export const CATALOG_FADE_SECONDS = 1;
const START_GRACE_SECONDS = 2;
const BROKEN_RETRY_MS = 30_000;
const WATCHDOG_MS = 3000;

export const CATALOG_CLIP_BASE = 'https://tymultiverse.cc/images/people/walking';
export const CATALOG_MAX_NUMBERED_CLIPS = 200;
/** prison.mp4, prison2.mp4 ... only join the rotation for viewers allowed to see the full presenter (data-full="true"). */
export const RESTRICTED_CLIP_BASE = 'https://tymultiverse.cc/images/people/prison';

/** Finds the restricted playlist: prison.mp4, then prison2.mp4 through the first missing number. */
export async function discoverRestrictedClips(
  exists: (url: string) => Promise<boolean>,
  base = RESTRICTED_CLIP_BASE,
  max = CATALOG_MAX_NUMBERED_CLIPS,
): Promise<string[]> {
  const clips: string[] = [];
  for (let number = 1; number <= max; number += 1) {
    const url = number === 1 ? `${base}.mp4` : `${base}${number}.mp4`;
    try {
      if (!await exists(url)) break;
      clips.push(url);
    } catch {
      break;
    }
  }
  return clips;
}

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

export function keepCatalogVideoPlaying(root: ParentNode = document, fadeSeconds = CATALOG_FADE_SECONDS): { add(url: string, options?: { restricted?: boolean }): void } | undefined {
  const all = Array.from(root.querySelectorAll<HTMLVideoElement>('.learn-catalog-video video'));
  if (!all.length) return undefined;
  const container = all[0].parentElement;
  const broken = new Set<HTMLVideoElement>();
  const restricted = new Set<HTMLVideoElement>();
  const allowed = (video: HTMLVideoElement) => !restricted.has(video) || (container as HTMLElement | null)?.dataset.full === 'true';
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
    video.addEventListener('error', () => {
      broken.add(video);
      video.style.opacity = '0';
      setTimeout(() => broken.delete(video), BROKEN_RETRY_MS); // a clip that failed once (network, low power) gets another chance
      if (video === active) recover();
    });
  };
  all.forEach((video, index) => prepare(video, index === 0));

  const play = (video: HTMLVideoElement) => {
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  };
  const nextPlayable = (): HTMLVideoElement => {
    const candidates = all.filter(video => video !== active && !broken.has(video) && allowed(video));
    if (!candidates.length) return active;
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    if (candidate) return candidate;
    return active;
  };
  // The next clip is picked as soon as the current one starts and loaded right away: iOS ignores preload on videos added
  // after the page loaded, so without this an added clip is still empty at its turn and the rotation falls back to the first two.
  let upcoming: HTMLVideoElement | null = null;
  const queueNext = () => {
    upcoming = nextPlayable();
    if (upcoming === active) { upcoming = null; return; }
    if (upcoming.readyState < 2) { upcoming.preload = 'auto'; upcoming.load(); }
  };
  const advance = () => {
    if (fading) return;
    const queued = upcoming && upcoming !== active && !broken.has(upcoming) && allowed(upcoming) ? upcoming : null;
    const incoming = queued ?? nextPlayable();
    if (incoming === active) { active.currentTime = 0; play(active); return; } // only one clip works: plain loop
    fading = true;
    const outgoing = active;
    incoming.currentTime = 0;
    play(incoming);
    incoming.style.opacity = '1';
    outgoing.style.opacity = '0';
    active = incoming;
    queueNext();
    setTimeout(() => {
      outgoing.pause();
      outgoing.currentTime = 0;
      fading = false;
    }, fadeSeconds * 1000);
    // The switch is only real once the new clip moves: if it never started, bring the old one back instead of leaving a black frame.
    setTimeout(() => {
      if (active !== incoming || (incoming.currentTime >= 0.1 && !incoming.paused)) return;
      broken.add(incoming);
      setTimeout(() => broken.delete(incoming), BROKEN_RETRY_MS);
      incoming.style.opacity = '0';
      outgoing.style.opacity = '1';
      outgoing.currentTime = 0;
      active = outgoing;
      play(outgoing);
      queueNext();
    }, (fadeSeconds + START_GRACE_SECONDS) * 1000);
  };
  /** The active clip failed: fade to another one that works, or, when none does, show the poster behind the frame. */
  const recover = () => {
    const other = all.find(video => video !== active && !broken.has(video) && allowed(video));
    if (!other) return;
    fading = false;
    active = other;
    other.currentTime = 0;
    other.style.opacity = '1';
    play(other);
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
  queueNext();
  // Watchdog: a clip that stops advancing without any event (stalled network, iOS suspending media) is nudged, then reloaded.
  let lastTime = -1;
  let stalled = 0;
  setInterval(() => {
    if (document.hidden || fading) return;
    const stuck = active.paused || (active.currentTime === lastTime && !active.ended);
    lastTime = active.currentTime;
    stalled = stuck ? stalled + 1 : 0;
    if (!stuck) return;
    if (stalled >= 3) { stalled = 0; active.load(); }
    play(active);
  }, WATCHDOG_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && active.paused) play(active); });
  for (const type of ['touchstart', 'pointerdown', 'click', 'scroll', 'keydown']) {
    document.addEventListener(type, () => { if (active.paused) play(active); }, { once: true, passive: true });
  }

  return {
    add(url: string, options: { restricted?: boolean } = {}) {
      if (!container) return;
      const video = document.createElement('video');
      video.src = url;
      video.preload = options.restricted ? 'metadata' : 'auto';
      if (options.restricted) restricted.add(video);
      video.setAttribute('disablepictureinpicture', '');
      video.tabIndex = -1;
      prepare(video, false);
      wire(video);
      container.append(video);
      all.push(video);
      if (!upcoming) queueNext();
    },
  };
}
