/** Keep each silent looping presenter tied to its own audio and allow only one audio at a time. */
export function bindMarketAudioPlayback(list: HTMLElement, audio: HTMLAudioElement, video: HTMLVideoElement) {
  audio.addEventListener('play', () => {
    list.querySelectorAll('audio').forEach(other => {
      if (other !== audio) other.pause();
    });
  });
  audio.addEventListener('playing', () => { void video.play().catch(() => {}); });
  for (const event of ['pause', 'waiting', 'ended', 'error']) {
    audio.addEventListener(event, () => video.pause());
  }
}
