import { describe, expect, it, vi } from 'vitest';
import { notificationPanelLayout } from '../../src/scripts/notifications/layout';
import { mountNotifications } from '../../src/scripts/notifications/center';

describe('notification overlay layout', () => {
  it('anchors the panel below the desktop bell and inside the viewport', () => {
    expect(notificationPanelLayout({ top: 8, bottom: 40, right: 1492 }, { width: 1536, height: 762 }, 180))
      .toEqual({ left: 1072, top: 50, width: 420, maxHeight: 560 });
  });

  it('fits a phone and opens above a bell near the bottom of the mobile menu', () => {
    const result = notificationPanelLayout({ top: 600, bottom: 632, right: 370 }, { width: 390, height: 700 }, 220);
    expect(result).toEqual({ left: 16, top: 370, width: 358, maxHeight: 560 });
  });

  it('limits long lists to the space below the bell', () => {
    const result = notificationPanelLayout({ top: 8, bottom: 40, right: 370 }, { width: 390, height: 400 }, 560);
    expect(result.maxHeight).toBe(334);
    expect(result.top + result.maxHeight).toBeLessThanOrEqual(384);
  });

  it('opens in the browser top layer so a clipping nav cannot hide it, and offers a close action', () => {
    document.body.innerHTML = `<nav style="overflow:hidden;height:48px"><div id="center"><button data-bell></button><span data-count></span><section data-panel popover="manual" hidden><button data-close></button><button data-read-all></button><ul data-list></ul><p data-empty></p></section></div></nav>`;
    const root = document.querySelector<HTMLElement>('#center')!;
    const panel = root.querySelector<HTMLElement>('[data-panel]')!;
    const show = vi.fn(); const hide = vi.fn();
    Object.defineProperties(panel, { showPopover: { value: show }, hidePopover: { value: hide } });
    const cleanup = mountNotifications(root, '', [], 'zh');
    root.querySelector<HTMLButtonElement>('[data-bell]')!.click();
    expect(show).toHaveBeenCalledOnce();
    expect(panel.hidden).toBe(false);
    expect(panel.style.maxHeight).not.toBe('');
    root.querySelector<HTMLButtonElement>('[data-close]')!.click();
    expect(hide).toHaveBeenCalledOnce();
    expect(panel.hidden).toBe(true);
    expect(root.querySelector('[data-bell]')).toHaveFocus();
    cleanup();
  });
});
