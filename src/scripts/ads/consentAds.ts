import { responsiveBannerForWidth } from './responsiveBanner';

const ADSTERRA_UNITS = {
  '300x250': { key: '2143d97a1a273993069cffe00f798381', width: 300, height: 250 },
  '160x300': { key: '618d7d0bfdf4ec298a513fa81377b412', width: 160, height: 300 },
} as const;
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

async function addAdsterra(slot: HTMLElement, unit: { key: string; width: number; height: number }): Promise<void> {
  slot.dataset.loaded = 'true';
  slot.style.width = `${unit.width}px`;
  slot.style.height = `${unit.height}px`;
  (window as Window & { atOptions?: unknown }).atOptions = {
    key: unit.key,
    format: 'iframe',
    height: unit.height,
    width: unit.width,
    params: {},
  };
  await addScript(slot, `https://bauval.org/22/${unit.key}`);
}

export function unmountPublisherAds(root: ParentNode): void {
  requestGeneration += 1;
  root.querySelectorAll<HTMLElement>('[data-adsterra], [data-monetag-zone]').forEach(slot => {
    slot.querySelectorAll<HTMLScriptElement>('script').forEach(script => { script.dispatchEvent(new Event('error')); script.remove(); });
    slot.querySelectorAll('iframe').forEach(node => node.remove());
    delete slot.dataset.loaded;
  });
  document.querySelectorAll<HTMLScriptElement>('script[src*="bauval.org/"], script[src*="nap5k.com/"]').forEach(script => { script.dispatchEvent(new Event('error')); script.remove(); });
}

export async function mountPublisherAds(root: ParentNode, allowed: boolean, viewportWidth = window.innerWidth): Promise<void> {
  const generation = ++requestGeneration;
  if (!allowed) { unmountPublisherAds(root); return; }
  for (const slot of Array.from(root.querySelectorAll<HTMLElement>('[data-adsterra]'))) {
    if (generation !== requestGeneration) return;
    if (slot.dataset.loaded === 'true') continue;
    const type = slot.dataset.adsterra;
    if (type === 'native') {
      slot.dataset.loaded = 'true';
      await addScript(slot, 'https://bauval.org/21/06e9cf3d5469a7e1c33e98da08c56876', true, { cfasync: 'false' });
    } else {
      const unit = type === 'responsive' ? responsiveBannerForWidth(viewportWidth) : ADSTERRA_UNITS[type as keyof typeof ADSTERRA_UNITS];
      if (unit) await addAdsterra(slot, unit);
    }
  }
  for (const slot of Array.from(root.querySelectorAll<HTMLElement>('[data-monetag-zone]'))) {
    if (generation !== requestGeneration) return;
    if (slot.dataset.loaded === 'true') continue;
    slot.dataset.loaded = 'true';
    await addScript(document.head, 'https://nap5k.com/tag.min.js', true, { zone: slot.dataset.monetagZone ?? '' });
  }
}
