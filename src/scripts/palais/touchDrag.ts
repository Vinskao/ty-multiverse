// 手機沒有 HTML5 drag & drop（dragstart / drop 不會被觸發），所以另外做「長按後跟手拖曳」。
// 長按前移動 = 使用者在捲動頁面，不攔截；長按後才接管並阻止捲動。
export interface TouchDragOptions {
  cardSelector: string;
  /** 長按多久才開始拖曳（毫秒） */
  holdMs?: number;
  /** 長按前手指移動超過這個距離，就視為捲動而放棄拖曳（像素） */
  tolerance?: number;
  /** 取得手指下的元素；預設 document.elementFromPoint，測試可注入 */
  pointAt?: (x: number, y: number) => Element | null;
  onStart?: (card: HTMLElement) => void;
  onHover?: (target: Element | null) => void;
  onDrop: (card: HTMLElement, target: Element | null, x: number, y: number) => void;
  onEnd?: () => void;
}

const EDGE = 72;
const SCROLL_STEP = 14;

function createGhost(card: HTMLElement): HTMLElement {
  const ghost = document.createElement('div');
  ghost.className = 'touch-drag-ghost';
  ghost.style.cssText =
    'position:fixed;left:0;top:0;z-index:100000;pointer-events:none;opacity:.88;' +
    'filter:drop-shadow(0 6px 14px rgba(0,0,0,.6));will-change:transform;';
  const img = card.querySelector('img');
  if (img) {
    const clone = img.cloneNode() as HTMLImageElement;
    clone.removeAttribute('id');
    clone.style.cssText = 'display:block;height:140px;width:auto;max-width:none;opacity:1;margin:0;';
    ghost.appendChild(clone);
  }
  document.body.appendChild(ghost);
  return ghost;
}

export function enableTouchDrag(options: TouchDragOptions, doc: Document = document): () => void {
  const holdMs = options.holdMs ?? 280;
  const tolerance = options.tolerance ?? 10;
  const pointAt = options.pointAt ?? ((x: number, y: number) => doc.elementFromPoint(x, y));
  let swallowClick = false;
  let cleanupCurrent: (() => void) | null = null;

  const onClickCapture = (event: Event) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    const found = (event.target as Element | null)?.closest?.(options.cardSelector) as HTMLElement | null;
    if (!found) return;
    const card: HTMLElement = found;
    cleanupCurrent?.();

    const first = event.touches[0];
    const startX = first.clientX;
    const startY = first.clientY;
    let x = startX;
    let y = startY;
    let active = false;
    let ghost: HTMLElement | null = null;
    let raf = 0;

    const place = () => {
      if (ghost) ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -70%)`;
    };
    const autoScroll = () => {
      if (!active) return;
      const height = window.innerHeight;
      if (y < EDGE) window.scrollBy(0, -SCROLL_STEP);
      else if (y > height - EDGE) window.scrollBy(0, SCROLL_STEP);
      raf = window.requestAnimationFrame(autoScroll);
    };
    const hold = window.setTimeout(() => {
      active = true;
      ghost = createGhost(card);
      card.classList.add('touch-dragging');
      try { navigator.vibrate?.(12); } catch { /* 不支援震動 */ }
      options.onStart?.(card);
      place();
      raf = window.requestAnimationFrame(autoScroll);
    }, holdMs);

    const onMove = (ev: TouchEvent) => {
      const point = ev.touches[0];
      if (!point) return;
      x = point.clientX;
      y = point.clientY;
      if (!active) {
        if (Math.hypot(x - startX, y - startY) > tolerance) stop();
        return;
      }
      ev.preventDefault();
      place();
      options.onHover?.(pointAt(x, y));
    };
    const onEnd = (ev: TouchEvent) => {
      const wasActive = active;
      const point = ev.changedTouches[0];
      if (point) { x = point.clientX; y = point.clientY; }
      const target = wasActive && ev.type === 'touchend' ? pointAt(x, y) : null;
      const dropped = wasActive && ev.type === 'touchend';
      stop();
      if (wasActive) {
        if (ev.cancelable) ev.preventDefault();
        swallowClick = true;
        window.setTimeout(() => { swallowClick = false; }, 400);
        options.onHover?.(null);
        if (dropped) options.onDrop(card, target, x, y);
        options.onEnd?.();
      }
    };
    const onContextMenu = (ev: Event) => { if (active) ev.preventDefault(); };

    function stop() {
      window.clearTimeout(hold);
      if (raf) window.cancelAnimationFrame(raf);
      active = false;
      ghost?.remove();
      ghost = null;
      card.classList.remove('touch-dragging');
      card.removeEventListener('touchmove', onMove);
      card.removeEventListener('touchend', onEnd);
      card.removeEventListener('touchcancel', onEnd);
      card.removeEventListener('contextmenu', onContextMenu);
      if (cleanupCurrent === stop) cleanupCurrent = null;
    }

    card.addEventListener('touchmove', onMove, { passive: false });
    card.addEventListener('touchend', onEnd, { passive: false });
    card.addEventListener('touchcancel', onEnd, { passive: false });
    card.addEventListener('contextmenu', onContextMenu);
    cleanupCurrent = stop;
  };

  doc.addEventListener('touchstart', onTouchStart, { passive: true });
  doc.addEventListener('click', onClickCapture, true);
  return () => {
    cleanupCurrent?.();
    doc.removeEventListener('touchstart', onTouchStart);
    doc.removeEventListener('click', onClickCapture, true);
  };
}
