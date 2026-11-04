/** Keep each silent looping presenter tied to its own audio and allow only one audio at a time. */
export function bindMarketAudioPlayback(list: HTMLElement, audio: HTMLAudioElement, video: HTMLVideoElement) {
  const clips = [
    'https://tymultiverse.cc/images/people/reporter.mp4',
    'https://tymultiverse.cc/images/people/reporter2.mp4',
  ];
  let clipIndex = 0;
  let audioPlaying = false;
  video.loop = false;
  video.src = clips[clipIndex];
  video.addEventListener('ended', () => {
    clipIndex = (clipIndex + 1) % clips.length;
    video.src = clips[clipIndex];
    if (audioPlaying && !audio.paused && !audio.ended) void video.play().catch(() => {});
  });
  audio.addEventListener('play', () => {
    list.querySelectorAll('audio').forEach(other => {
      if (other !== audio) other.pause();
    });
  });
  audio.addEventListener('playing', () => { audioPlaying = true; void video.play().catch(() => {}); });
  for (const event of ['pause', 'waiting', 'ended', 'error']) {
    audio.addEventListener(event, () => { audioPlaying = false; video.pause(); });
  }
}
