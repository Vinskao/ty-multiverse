// The overview videos (walking.mp4 -> hiking.mp4 -> walking.mp4 ...) play one after another and repeat,
// joined by a cross-fade: the next clip starts under the current one while the current one fades out.
// iOS (low-power mode, data saver) blocks autoplay and shows a native play button, so we force
// muted + play() and retry on the first touch / scroll / tab return.
export const CATALOG_FADE_SECONDS = 1;

export function keepCatalogVideoPlaying(root: ParentNode = document, fadeSeconds = CATALOG_FADE_SECONDS): void {
  const all = Array.from(root.querySelectorAll<HTMLVideoElement>('.learn-catalog-video video'));
  if (!all.length) return;
  const broken = new Set<HTMLVideoElement>();
  let active = all[0];
  let fading = false;

  for (const [index, video] of all.entries()) {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = all.length === 1;
    video.controls = false;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.style.opacity = index === 0 ? '1' : '0';
    video.addEventListener('error', () => { broken.add(video); video.style.opacity = '0'; });
  }

  const play = (video: HTMLVideoElement) => {
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  };
  const nextPlayable = (): HTMLVideoElement => {
    const start = all.indexOf(active);
    for (let step = 1; step <= all.length; step += 1) {
      const candidate = all[(start + step) % all.length];
      if (!broken.has(candidate)) return candidate;
    }
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

  for (const video of all) {
    video.addEventListener('timeupdate', () => {
      if (video !== active || fading || !Number.isFinite(video.duration) || video.duration <= 0) return;
      if (video.duration - video.currentTime <= fadeSeconds) advance();
    });
    video.addEventListener('ended', () => { if (video === active) advance(); });
    video.addEventListener('loadeddata', () => { if (video === active && video.paused) play(video); });
    video.addEventListener('pause', () => { if (video === active && !fading && !document.hidden) play(video); });
  }

  play(active);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && active.paused) play(active); });
  for (const type of ['touchstart', 'pointerdown', 'click', 'scroll', 'keydown']) {
    document.addEventListener(type, () => { if (active.paused) play(active); }, { once: true, passive: true });
  }
}
