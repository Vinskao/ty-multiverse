import { API_BASE } from '../../common/constants/api';

/** The backend's hand-maintained BPMN 2.0 module overview (ty-multiverse-backend docs/PRODUCT_INTEGRITY.md). */
export const BPMN_URL = `${API_BASE}/api/business-processes.bpmn`;
const TIMEOUT_MS = 20000;

type Viewer = { importXML(xml: string): Promise<unknown>; get(name: 'canvas'): { zoom(level: string): void }; destroy(): void };
type Deps = { fetch: typeof fetch; createViewer: (container: HTMLElement) => Promise<Viewer> };

const defaultDeps: Deps = {
  fetch: (...args) => fetch(...args),
  // bpmn-js is about 1 MB: loaded only when someone opens the diagram.
  createViewer: async container => {
    const [{ default: NavigatedViewer }] = await Promise.all([
      import('bpmn-js/lib/NavigatedViewer'), import('bpmn-js/dist/assets/diagram-js.css')]);
    return new NavigatedViewer({ container }) as unknown as Viewer;
  },
};

/** Draws the diagram the first time the <details> opens; a failure can be retried by closing and reopening. */
export function initBusinessProcess(root: ParentNode = document, deps: Deps = defaultDeps): void {
  const details = root.querySelector<HTMLDetailsElement>('[data-business-process]');
  const canvas = details?.querySelector<HTMLElement>('[data-business-process-canvas]');
  const status = details?.querySelector<HTMLElement>('[data-business-process-status]');
  if (!details || !canvas || !status || details.dataset.bound) return;
  details.dataset.bound = 'true';
  let state: 'idle' | 'loading' | 'done' = 'idle';
  details.addEventListener('toggle', async () => {
    if (!details.open || state !== 'idle') return;
    state = 'loading';
    canvas.setAttribute('aria-busy', 'true');
    status.hidden = false;
    status.className = 'business-process-status business-process-status--loading';
    status.textContent = '流程圖載入中…';
    try {
      const response = await deps.fetch(BPMN_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      const viewer = await deps.createViewer(canvas);
      await viewer.importXML(xml);
      viewer.get('canvas').zoom('fit-viewport');
      status.hidden = true;
      state = 'done';
    } catch {
      status.className = 'business-process-status business-process-status--error';
      status.textContent = '流程圖暫時無法載入，請收起後再展開重試。';
      state = 'idle';
    } finally {
      canvas.removeAttribute('aria-busy');
    }
  });
}
