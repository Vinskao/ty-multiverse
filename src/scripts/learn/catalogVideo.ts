// iOS（低電量模式、省流量）會擋掉自動播放並疊上原生播放鍵。
// 先強制 muted + play()，被擋時在第一次觸碰／捲動／回到分頁時重試。
export function keepCatalogVideoPlaying(root: ParentNode = document): void {
  const video = root.querySelector<HTMLVideoElement>('.learn-catalog-video video');
  if (!video) return;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.controls = false;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  const play = () => {
    if (!video.paused) return;
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  };
  play();
  video.addEventListener('loadeddata', play);
  video.addEventListener('canplay', play);
  video.addEventListener('pause', () => { if (!document.hidden) play(); });
  video.addEventListener('ended', () => { video.currentTime = 0; play(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });
  for (const type of ['touchstart', 'pointerdown', 'click', 'scroll', 'keydown']) {
    document.addEventListener(type, play, { once: true, passive: true });
  }
}
