/** Keep the presenter visible while the next silent clip starts. */
export function bindMarketAudioPlayback(list: HTMLElement, audio: HTMLAudioElement, video: HTMLVideoElement) {
  const clips = ['https://tymultiverse.cc/images/people/reporter.mp4', 'https://tymultiverse.cc/images/people/reporter2.mp4'];
  video.poster = 'https://tymultiverse.cc/images/people/reporter.png';
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
  let reversing = false;
  let switching = false;
  let reverseTimer: ReturnType<typeof setTimeout> | undefined;
  let lastReverseTime = 0;
  function stopReverse() {
    if (reverseTimer !== undefined) clearTimeout(reverseTimer);
    reverseTimer = undefined;
  }
  function reverseFrame() {
    reverseTimer = undefined;
    if (!audioPlaying || audio.paused || audio.ended || !reversing) return;
    const current = players[active];
    const now = performance.now();
    const elapsed = Math.min((now - lastReverseTime) / 1000, 0.2);
    lastReverseTime = now;
    current.currentTime = Math.max(0, current.currentTime - elapsed);
    if (current.currentTime <= 0) {
      reversing = false;
      switching = true;
      void players[1 - active].play().catch(() => {});
    } else {
      reverseTimer = setTimeout(reverseFrame, 50);
    }
  }
  function startReverse() {
    stopReverse();
    lastReverseTime = performance.now();
    reverseTimer = setTimeout(reverseFrame, 50);
  }
  video.src = clips[0];
  next.src = clips[1];
  players.forEach((player, index) => {
    player.loop = false;
    player.addEventListener('ended', () => {
      if (index !== active) return;
      reversing = true;
      player.pause();
      if (audioPlaying && !audio.paused && !audio.ended) startReverse();
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
      switching = false;
      previous.currentTime = 0;
    });
  });
  audio.addEventListener('play', () => {
    list.querySelectorAll('audio').forEach(other => { if (other !== audio) other.pause(); });
  });
  audio.addEventListener('playing', () => {
    audioPlaying = true;
    const current = players[active];
    if (reversing) startReverse();
    else void (switching ? players[1 - active] : current).play().catch(() => {});
  });
  for (const event of ['pause', 'waiting', 'ended', 'error']) {
    audio.addEventListener(event, () => { audioPlaying = false; stopReverse(); players.forEach(player => player.pause()); });
  }
}
