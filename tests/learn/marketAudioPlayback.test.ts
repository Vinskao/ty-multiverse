import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindMarketAudioPlayback, marketClipOrder } from '../../src/scripts/learn/marketAudioPlayback';

describe('market audio playback', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('uses clip order 1-2-3-1-4-5-1-6-7 and continues for any index', () => {
    expect(Array.from({ length: 9 }, (_, index) => marketClipOrder(index))).toEqual([0, 1, 2, 0, 3, 4, 0, 5, 6]);
    expect(marketClipOrder(100)).toBe(67);
  });

  it('retains the presenter poster on both video elements', () => {
    const list = document.createElement('div');
    const audio = document.createElement('audio');
    const video = document.createElement('video');
    list.append(audio, video);
    bindMarketAudioPlayback(list, audio, video);
    const videos = list.querySelectorAll('video');
    expect(videos).toHaveLength(2);
    videos.forEach(item => expect(item.poster).toBe('https://tymultiverse.cc/images/people/reporter.png'));
  });

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
    vi.useFakeTimers();
    const list = document.createElement('div');
    const audio = document.createElement('audio');
    const frame = document.createElement('div');
    const video = document.createElement('video');
    frame.append(video); list.append(audio, frame);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(audio, 'paused', 'get').mockReturnValue(false);
    vi.spyOn(video, 'duration', 'get').mockReturnValue(0.1);
    bindMarketAudioPlayback(list, audio, video);
    const next = frame.querySelectorAll('video')[1];
    const playNext = vi.spyOn(next, 'play').mockResolvedValue();
    expect(next?.src).toContain('/reporter2.mp4');
    audio.dispatchEvent(new Event('playing'));
    playNext.mockClear();
    video.currentTime = 0.1;
    video.dispatchEvent(new Event('ended'));
    expect(video.style.visibility).not.toBe('hidden');
    expect(playNext).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(playNext).toHaveBeenCalled();
    next.dispatchEvent(new Event('playing'));
    expect(video.style.visibility).toBe('hidden');
    expect(next.style.visibility).not.toBe('hidden');
    vi.spyOn(next, 'duration', 'get').mockReturnValue(0.1);
    next.currentTime = 0.1;
    next.dispatchEvent(new Event('ended'));
    audio.dispatchEvent(new Event('pause'));
    vi.advanceTimersByTime(200);
    expect(next.currentTime).toBe(0.1);
    const playsBeforeResume = playNext.mock.calls.length;
    audio.dispatchEvent(new Event('playing'));
    vi.advanceTimersByTime(200);
    expect(next.currentTime).toBe(0);
    expect(playNext.mock.calls.length).toBeGreaterThan(playsBeforeResume);
    vi.useRealTimers();
  });

