const FLOATING_FRAME_Z_INDEX = '2147483647';
const FRAME_WIDTH = '360px';
const inlineFrames = new WeakSet<HTMLIFrameElement>();

export function positionMonetagFloatingAds(root: ParentNode): void {
  const slot = root.querySelector<HTMLElement>('[data-monetag-zone][data-loaded="true"]');
  if (!slot) return;

  root.querySelectorAll<HTMLIFrameElement>('iframe').forEach(frame => {
    const style = frame.style;
    const matchesProviderFrame = style.position === 'fixed'
      && style.zIndex === FLOATING_FRAME_Z_INDEX && style.height === '190px'
      && (style.width === '100%' || style.width === FRAME_WIDTH);
    if (!matchesProviderFrame && !inlineFrames.has(frame)) return;

    inlineFrames.add(frame);
    const inlineStyle = {
      position: 'relative', top: 'auto', right: 'auto', bottom: 'auto', left: 'auto',
      width: FRAME_WIDTH, 'max-width': '100%', 'z-index': 'auto',
      display: 'block', 'margin-inline': 'auto',
    };
    for (const [property, value] of Object.entries(inlineStyle)) {
      if (style.getPropertyValue(property) !== value || style.getPropertyPriority(property) !== 'important') {
        style.setProperty(property, value, 'important');
      }
    }
    if (frame.parentElement !== slot) {
      const container = slot as HTMLElement & { moveBefore?: (node: Node, before: Node | null) => void };
      if (container.moveBefore) container.moveBefore(frame, null);
      else slot.append(frame);
    }
  });
}

let observer: MutationObserver | undefined;

export function observeMonetagFloatingAds(root: Document = document): void {
  observer?.disconnect();
  positionMonetagFloatingAds(root);
  const options = { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] };
  const placementObserver = new MutationObserver(() => {
    placementObserver.disconnect();
    try {
      positionMonetagFloatingAds(root);
    } finally {
      placementObserver.observe(root.documentElement, options);
    }
  });
  observer = placementObserver;
  placementObserver.observe(root.documentElement, options);
}
