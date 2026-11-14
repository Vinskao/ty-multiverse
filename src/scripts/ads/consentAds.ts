// 2026-11-14: the former banner network was removed (password-only account security, no publisher protection). Monetag only.
let requestGeneration = 0;

function addScript(parent: Element, src: string, async = false, data?: Record<string, string>): Promise<void> {
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = src;
    script.async = async;
    if (data) for (const [key, value] of Object.entries(data)) script.dataset[key] = value;
    let settled = false;
    const finish = () => { if (!settled) { settled = true; clearTimeout(timeout); resolve(); } };
    const timeout = setTimeout(finish, 5000);
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', finish, { once: true });
    parent.append(script);
  });
}

export function unmountPublisherAds(root: ParentNode): void {
  requestGeneration += 1;
  root.querySelectorAll<HTMLElement>('[data-monetag-zone]').forEach(slot => {
    slot.querySelectorAll<HTMLScriptElement>('script').forEach(script => { script.dispatchEvent(new Event('error')); script.remove(); });
    slot.querySelectorAll('iframe').forEach(node => node.remove());
    delete slot.dataset.loaded;
  });
  document.querySelectorAll<HTMLScriptElement>('script[src*="nap5k.com/"]').forEach(script => { script.dispatchEvent(new Event('error')); script.remove(); });
}

export async function mountPublisherAds(root: ParentNode, allowed: boolean): Promise<void> {
  const generation = ++requestGeneration;
  if (!allowed) { unmountPublisherAds(root); return; }
  for (const slot of Array.from(root.querySelectorAll<HTMLElement>('[data-monetag-zone]'))) {
    if (generation !== requestGeneration) return;
    if (slot.dataset.loaded === 'true') continue;
    slot.dataset.loaded = 'true';
    await addScript(document.head, 'https://nap5k.com/tag.min.js', true, { zone: slot.dataset.monetagZone ?? '' });
  }
}
