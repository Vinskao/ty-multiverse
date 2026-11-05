const FLOATING_FRAME_Z_INDEX = '2147483647';
const SAFE_BOTTOM = 'calc(112px + env(safe-area-inset-bottom))';

export function positionMonetagFloatingAds(root: ParentNode): void {
  root.querySelectorAll<HTMLIFrameElement>('iframe').forEach(frame => {
    const style = frame.style;
    if (style.position !== 'fixed' || style.zIndex !== FLOATING_FRAME_Z_INDEX || style.height !== '190px' || style.width !== '100%') return;
    if (style.top === 'auto' && style.right === '0px' && style.bottom === SAFE_BOTTOM && style.left === 'auto') return;
    style.setProperty('top', 'auto', 'important');
    style.setProperty('right', '0px', 'important');
    style.setProperty('bottom', SAFE_BOTTOM, 'important');
    style.setProperty('left', 'auto', 'important');
  });
}

let observer: MutationObserver | undefined;

export function observeMonetagFloatingAds(root: Document = document): void {
  observer?.disconnect();
  positionMonetagFloatingAds(root);
  observer = new MutationObserver(() => positionMonetagFloatingAds(root));
  observer.observe(root.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
}
