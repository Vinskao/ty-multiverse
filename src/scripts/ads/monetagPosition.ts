const MIN_FLOATING_Z_INDEX = 2147483000;
const MAX_BANNER_HEIGHT = 300;
const FRAME_WIDTH = '360px';
const inlineFrames = new WeakSet<HTMLIFrameElement>();

export function positionMonetagFloatingAds(root: ParentNode): void {
  const slot = root.querySelector<HTMLElement>('[data-monetag-zone][data-loaded="true"]');
  if (!slot) return;

  root.querySelectorAll<HTMLElement>('iframe, body > div').forEach(frame => {
    if (frame === slot || frame.contains(slot) || slot.contains(frame) && !inlineFrames.has(frame as HTMLIFrameElement)) return;
    const style = frame.style;
    const height = Number.parseFloat(style.height);
    // Provider overlays pin themselves with the top z-index; banners are short (the old rule only knew 190px).
    const matchesProviderFrame = style.position === 'fixed'
      && Number(style.zIndex) >= MIN_FLOATING_Z_INDEX
      && (Number.isNaN(height) || height <= MAX_BANNER_HEIGHT);
    if (!matchesProviderFrame && !inlineFrames.has(frame as HTMLIFrameElement)) return;

    inlineFrames.add(frame as HTMLIFrameElement);
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

export function removeMonetagFloatingAds(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('iframe, body > div').forEach(frame => {
    const height = Number.parseFloat(frame.style.height);
    if (frame.style.position !== 'fixed' || Number(frame.style.zIndex) < MIN_FLOATING_Z_INDEX
      || (!Number.isNaN(height) && height > MAX_BANNER_HEIGHT)) return;
    frame.remove();
  });
}

let observer: MutationObserver | undefined;

export function observeMonetagFloatingAds(root: Document = document, isAdFree: () => boolean = () => false): void {
  observer?.disconnect();
  if (isAdFree()) removeMonetagFloatingAds(root);
  else positionMonetagFloatingAds(root);
  const options = { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] };
  const placementObserver = new MutationObserver(() => {
    placementObserver.disconnect();
    try {
      if (isAdFree()) removeMonetagFloatingAds(root);
      else positionMonetagFloatingAds(root);
    } finally {
      placementObserver.observe(root.documentElement, options);
    }
  });
  observer = placementObserver;
  placementObserver.observe(root.documentElement, options);
}
