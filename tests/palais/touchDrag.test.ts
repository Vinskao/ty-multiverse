import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableTouchDrag } from '../../src/scripts/palais/touchDrag';

function touch(type: string, target: Element, x: number, y: number) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: x, clientY: y, identifier: 1, target };
  const list = type === 'touchend' || type === 'touchcancel' ? [] : [point];
  Object.defineProperty(ev, 'touches', { value: list });
  Object.defineProperty(ev, 'changedTouches', { value: [point] });
  target.dispatchEvent(ev);
  return ev;
}

describe('enableTouchDrag (long-press drag for phones)', () => {
  let card: HTMLElement;
  let cart: HTMLElement;
  let dispose: () => void;
  const onDrop = vi.fn();
  const onStart = vi.fn();
  const onEnd = vi.fn();
  const onHover = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="palais-cart"></div><div class="grid"><div class="pg-draggable"><img alt="x" src="a.png"></div></div>';
    card = document.querySelector('.pg-draggable') as HTMLElement;
    cart = document.getElementById('palais-cart') as HTMLElement;
    onDrop.mockReset(); onStart.mockReset(); onEnd.mockReset(); onHover.mockReset();
    dispose = enableTouchDrag({
      cardSelector: '.pg-draggable',
      holdMs: 250,
      tolerance: 10,
      pointAt: () => cart,
      onStart, onEnd, onDrop, onHover,
    });
  });
  afterEach(() => { dispose(); vi.useRealTimers(); document.body.innerHTML = ''; });

  it('drops the card on whatever is under the finger after a long press', () => {
    touch('touchstart', card, 50, 200);
    vi.advanceTimersByTime(260);
    expect(onStart).toHaveBeenCalledWith(card);
    expect(card.classList.contains('touch-dragging')).toBe(true);
    expect(document.querySelector('.touch-drag-ghost')).not.toBeNull();

    const move = touch('touchmove', card, 120, 220);
    expect(move.defaultPrevented).toBe(true); // 阻止頁面捲動
    expect(onHover).toHaveBeenLastCalledWith(cart);

    touch('touchend', card, 120, 220);
    expect(onDrop).toHaveBeenCalledWith(card, cart, 120, 220);
    expect(onEnd).toHaveBeenCalled();
    expect(card.classList.contains('touch-dragging')).toBe(false);
    expect(document.querySelector('.touch-drag-ghost')).toBeNull();
  });

  it('lets the page scroll when the finger moves before the long press fires', () => {
    touch('touchstart', card, 50, 200);
    const move = touch('touchmove', card, 50, 260);
    vi.advanceTimersByTime(400);
    expect(move.defaultPrevented).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
    touch('touchend', card, 50, 260);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('treats a quick tap as a tap (no drag, no drop)', () => {
    touch('touchstart', card, 50, 200);
    vi.advanceTimersByTime(100);
    touch('touchend', card, 50, 200);
    vi.advanceTimersByTime(400);
    expect(onStart).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('cancels without dropping when the touch is interrupted', () => {
    touch('touchstart', card, 50, 200);
    vi.advanceTimersByTime(260);
    touch('touchcancel', card, 60, 210);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalled();
    expect(document.querySelector('.touch-drag-ghost')).toBeNull();
  });

  it('swallows the click that follows a drag so the lightbox does not open', () => {
    const click = vi.fn();
    card.addEventListener('click', click);
    touch('touchstart', card, 50, 200);
    vi.advanceTimersByTime(260);
    touch('touchend', card, 50, 200);
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(click).not.toHaveBeenCalled();
  });

  it('ignores touches that do not start on a card, and stops after dispose', () => {
    touch('touchstart', cart, 5, 5);
    vi.advanceTimersByTime(400);
    expect(onStart).not.toHaveBeenCalled();
    dispose();
    touch('touchstart', card, 50, 200);
    vi.advanceTimersByTime(400);
    expect(onStart).not.toHaveBeenCalled();
  });
});
