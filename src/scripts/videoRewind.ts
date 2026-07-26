// 影片反向播放（rewind）抽象工具。
//
// <video> 原生不支援負的 playbackRate，所以「倒帶播放」靠 requestAnimationFrame
// 逐格把 currentTime 往回退。此作法沿用 dance.ts 的 manualReversePlayback：
// 先 seek 到結尾，之後每一幀將 currentTime 減去固定量，直到接近 0 為止。
//
// 用法：
//   const handle = reversePlay(video, { onComplete: () => nextThing() });
//   handle.cancel(); // 需要提前中止時

export interface ReversePlayOptions {
  /** 每一幀往回退的秒數（預設 1/30，與 dance.ts 相同）。 */
  speed?: number;
  /** 視為抵達開頭的門檻秒數（預設 0.1）。 */
  threshold?: number;
  /** 每幀檢查是否應繼續；回傳 false 會停止（不觸發 onComplete）。 */
  shouldContinue?: () => boolean;
  /** 倒帶回到開頭後呼叫。 */
  onComplete?: () => void;
}

export interface ReversePlayHandle {
  /** 提前中止倒帶（不會觸發 onComplete）。 */
  cancel(): void;
}

export function reversePlay(
  video: HTMLVideoElement,
  options: ReversePlayOptions = {},
): ReversePlayHandle {
  const speed = options.speed ?? 1 / 30;
  const threshold = options.threshold ?? 0.1;

  let rafId = 0;
  let cancelled = false;

  // 從結尾開始倒帶
  video.playbackRate = 1;
  video.pause();
  if (Number.isFinite(video.duration) && video.duration > 0) {
    try { video.currentTime = video.duration; } catch { /* noop */ }
  }

  const frame = () => {
    if (cancelled) return;
    if (options.shouldContinue && !options.shouldContinue()) return;

    if (video.currentTime <= threshold) {
      try { video.currentTime = 0; } catch { /* noop */ }
      options.onComplete?.();
      return;
    }

    try { video.currentTime = Math.max(0, video.currentTime - speed); } catch { /* noop */ }
    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);

  return {
    cancel() {
      cancelled = true;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    },
  };
}
