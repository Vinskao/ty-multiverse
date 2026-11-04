/** Keep the presenter visible while the next silent clip starts. */
export function bindMarketAudioPlayback(list: HTMLElement, audio: HTMLAudioElement, video: HTMLVideoElement) {
  const clips = ['https://tymultiverse.cc/images/people/reporter.mp4', 'https://tymultiverse.cc/images/people/reporter2.mp4'];
  const next = video.cloneNode(false) as HTMLVideoElement;
  next.muted = true;
  next.playsInline = true;
  next.preload = 'auto';
  next.style.position = 'absolute';
  next.style.inset = '0';
  next.style.visibility = 'hidden';
  if (video.parentElement) video.parentElement.style.position = 'relative';
  video.after(next);
  const players = [video, next];
  let active = 0;
  let audioPlaying = false;
  video.src = clips[0];
  next.src = clips[1];
  players.forEach((player, index) => {
    player.loop = false;
    player.addEventListener('ended', () => {
      if (index !== active || !audioPlaying || audio.paused || audio.ended) return;
      void players[1 - active].play().catch(() => {});
    });
    player.addEventListener('playing', () => {
      if (index === active || !audioPlaying || audio.paused || audio.ended) return;
      const previous = players[active];
      player.style.position = 'relative';
      player.style.visibility = 'visible';
      previous.style.position = 'absolute';
      previous.style.inset = '0';
      previous.style.visibility = 'hidden';
      active = index;
      previous.currentTime = 0;
    });
  });
  audio.addEventListener('play', () => {
    list.querySelectorAll('audio').forEach(other => { if (other !== audio) other.pause(); });
  });
  audio.addEventListener('playing', () => {
    audioPlaying = true;
    const current = players[active];
    void (current.ended ? players[1 - active] : current).play().catch(() => {});
  });
  for (const event of ['pause', 'waiting', 'ended', 'error']) {
    audio.addEventListener(event, () => { audioPlaying = false; players.forEach(player => player.pause()); });
  }
}
