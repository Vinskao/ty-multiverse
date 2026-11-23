import { GATEWAY_API_BASE } from '../../common/constants/api';

/** Hand-maintained BPMN 2.0 overviews: gateway docs/BUSINESS_PROCESS_BPMN.md and backend docs/PRODUCT_INTEGRITY.md. */
export const BACKEND_BPMN_URL = `${GATEWAY_API_BASE}/api/business-processes.bpmn`;
export const GATEWAY_BPMN_URL = `${GATEWAY_API_BASE}/api/gateway.bpmn`;
const TIMEOUT_MS = 20000;

type Viewer = { importXML(xml: string): Promise<unknown>; get(name: 'canvas'): { zoom(level: string): void }; destroy(): void };
type Deps = { fetch: typeof fetch; createViewer: (container: HTMLElement) => Promise<Viewer> };

const defaultDeps: Deps = {
  fetch: (...args) => fetch(...args),
  // bpmn-js is about 1 MB: loaded only when someone opens the diagram.
  createViewer: async container => {
    const [{ default: NavigatedViewer }] = await Promise.all([
      import('bpmn-js/lib/NavigatedViewer'), import('bpmn-js/dist/assets/diagram-js.css')]);
    const viewer = new NavigatedViewer({ container });
    const zoomScroll = viewer.get('zoomScroll') as {
      toggle(enabled: boolean): void;
      stepZoom(direction: number, position: { x: number; y: number }): void;
    };
    zoomScroll.toggle(false);
    const listener = (event: WheelEvent) => {
      if (!event.deltaY) return;
      event.preventDefault();
      const { left, top } = container.getBoundingClientRect();
      zoomScroll.stepZoom(event.deltaY < 0 ? 1 : -1, { x: event.clientX - left, y: event.clientY - top });
    };
    container.addEventListener('wheel', listener, { passive: false });
    viewer.on('diagram.destroy', () => container.removeEventListener('wheel', listener));
    return viewer as unknown as Viewer;
  },
};

/** Draws the diagram the first time the <details> opens; a failure can be retried by closing and reopening. */
export function initBusinessProcess(root: ParentNode = document, deps: Deps = defaultDeps): void {
  const details = root.querySelector<HTMLDetailsElement>('[data-business-process]');
  const canvas = details?.querySelector<HTMLElement>('[data-business-process-canvas]');
  const status = details?.querySelector<HTMLElement>('[data-business-process-status]');
  if (!details || !canvas || !status || details.dataset.bound) return;
  details.dataset.bound = 'true';
  const picker = details.querySelector<HTMLSelectElement>('[data-business-process-picker]');
  let state: 'idle' | 'loading' | 'done' = 'idle';
  const lifecycle = new AbortController();
  let viewer: Viewer | undefined;
  if (root === document) {
    document.addEventListener('astro:before-swap', () => {
      lifecycle.abort();
      viewer?.destroy();
    }, { once: true });
  }
  const load = async () => {
    if (!details.open || state !== 'idle') return;
    state = 'loading';
    if (picker) picker.disabled = true;
    canvas.setAttribute('aria-busy', 'true');
    status.hidden = false;
    status.className = 'business-process-status business-process-status--loading';
    status.textContent = '流程圖載入中…';
    try {
      const response = await deps.fetch(picker?.value === 'backend' ? BACKEND_BPMN_URL : GATEWAY_BPMN_URL, { signal: AbortSignal.any([lifecycle.signal, AbortSignal.timeout(TIMEOUT_MS)]) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      if (lifecycle.signal.aborted) return;
      viewer = await deps.createViewer(canvas);
      if (lifecycle.signal.aborted) { viewer.destroy(); return; }
      await viewer.importXML(xml);
      if (lifecycle.signal.aborted) return;
      const fit = () => { if (details.open) viewer?.get('canvas').zoom('fit-viewport'); };
      fit();
      if (!details.open) details.addEventListener('toggle', fit, { once: true, signal: lifecycle.signal });
      status.hidden = true;
      state = 'done';
    } catch {
      if (lifecycle.signal.aborted) return;
      viewer?.destroy();
      viewer = undefined;
      status.className = 'business-process-status business-process-status--error';
      status.textContent = '流程圖暫時無法載入，請收起後再展開重試。';
      state = 'idle';
    } finally {
      canvas.removeAttribute('aria-busy');
      if (picker) picker.disabled = false;
    }
  };
  details.addEventListener('toggle', load);
  picker?.addEventListener('change', () => {
    viewer?.destroy();
    viewer = undefined;
    state = 'idle';
    void load();
  });
}
