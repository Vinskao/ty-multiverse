import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindMarketAudioPlayback } from '../../src/scripts/learn/marketAudioPlayback';

describe('market audio playback', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('plays and pauses each video with its own audio and prevents simultaneous playback', () => {
    const list = document.createElement('div');
    document.body.append(list);
    const pairs = [0, 1].map(() => {
      const audio = document.createElement('audio');
      const video = document.createElement('video');
      list.append(audio, video);
      const playVideo = vi.spyOn(video, 'play').mockResolvedValue();
      const pauseVideo = vi.spyOn(video, 'pause').mockImplementation(() => {});
      const pauseAudio = vi.spyOn(audio, 'pause').mockImplementation(() => audio.dispatchEvent(new Event('pause')));
      bindMarketAudioPlayback(list, audio, video);
      return { audio, video, playVideo, pauseVideo, pauseAudio };
    });
    pairs[0].audio.dispatchEvent(new Event('play'));
    pairs[0].audio.dispatchEvent(new Event('playing'));
    expect(pairs[0].playVideo).toHaveBeenCalledOnce();
    expect(pairs[1].playVideo).not.toHaveBeenCalled();
    pairs[1].audio.dispatchEvent(new Event('play'));
    expect(pairs[0].pauseAudio).toHaveBeenCalled();
    expect(pairs[0].pauseVideo).toHaveBeenCalled();
    pairs[1].audio.dispatchEvent(new Event('playing'));
    expect(pairs[1].playVideo).toHaveBeenCalledOnce();
    const pausesBeforeWaiting = pairs[1].pauseVideo.mock.calls.length;
    pairs[1].audio.dispatchEvent(new Event('waiting'));
    expect(pairs[1].pauseVideo).toHaveBeenCalledTimes(pausesBeforeWaiting + 1);
    pairs[1].audio.dispatchEvent(new Event('pause'));
    expect(pairs[1].pauseVideo).toHaveBeenCalled();
    const pausesBeforeEnd = pairs[1].pauseVideo.mock.calls.length;
    pairs[1].audio.dispatchEvent(new Event('ended'));
    expect(pairs[1].pauseVideo).toHaveBeenCalledTimes(pausesBeforeEnd + 1);
  });

});

  it('keeps the current frame visible until the preloaded next clip is playing', async () => {
    const list = document.createElement('div');
    const audio = document.createElement('audio');
    const frame = document.createElement('div');
    const video = document.createElement('video');
    frame.append(video); list.append(audio, frame);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(audio, 'paused', 'get').mockReturnValue(false);
    bindMarketAudioPlayback(list, audio, video);
    const next = frame.querySelectorAll('video')[1];
    expect(next?.src).toContain('/reporter2.mp4');
    audio.dispatchEvent(new Event('playing'));
    video.dispatchEvent(new Event('ended'));
    expect(video.style.visibility).not.toBe('hidden');
    next.dispatchEvent(new Event('playing'));
    expect(video.style.visibility).toBe('hidden');
    expect(next.style.visibility).not.toBe('hidden');
  });

