import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { BACKEND_BPMN_URL, GATEWAY_BPMN_URL, initBusinessProcess } from '../../src/scripts/home/businessProcess';

const markup = () => {
  const root = document.createElement('div');
  root.innerHTML = '<details data-business-process><summary>s</summary><p data-business-process-status hidden></p><div data-business-process-canvas></div></details>';
  return root;
};
// Setting `open` queues the DOM's own toggle event; dispatching another one by hand would start a second load.
const open = async (details: HTMLDetailsElement, calls: () => number, before: number) => {
  details.open = true;
  await vi.waitFor(() => expect(calls()).toBe(before + 1));
  await vi.waitFor(() => expect(details.querySelector('[data-business-process-canvas]')!.hasAttribute('aria-busy')).toBe(false));
};

describe('business process diagram on the home page', () => {
  it('loads the gateway BPMN only when opened, shows a spinner meanwhile and fits it to the box', async () => {
    const root = markup();
    const zoom = vi.fn();
    const viewer = { importXML: vi.fn().mockResolvedValue({}), get: () => ({ zoom }), destroy: vi.fn() };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => '<definitions/>' });
    const createViewer = vi.fn().mockResolvedValue(viewer);
    initBusinessProcess(root, { fetch: fetcher, createViewer });
    expect(fetcher).not.toHaveBeenCalled();
    const details = root.querySelector('details')!;
    details.open = true;
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(root.querySelector('[data-business-process-status]')!.textContent).toContain('載入中');
    await vi.waitFor(() => expect(zoom).toHaveBeenCalledWith('fit-viewport'));
    expect(fetcher.mock.calls[0][0]).toBe(GATEWAY_BPMN_URL);
    expect(GATEWAY_BPMN_URL).toMatch(/\/tymg\/api\/gateway\.bpmn$/);
    expect(viewer.importXML).toHaveBeenCalledWith('<definitions/>');
    expect((root.querySelector('[data-business-process-status]') as HTMLElement).hidden).toBe(true);
  });

  it('says why it failed and retries on the next open instead of spinning forever', async () => {
    const root = markup();
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({ ok: true, text: async () => '<definitions/>' });
    const viewer = { importXML: vi.fn().mockResolvedValue({}), get: () => ({ zoom: vi.fn() }), destroy: vi.fn() };
    initBusinessProcess(root, { fetch: fetcher, createViewer: vi.fn().mockResolvedValue(viewer) });
    const details = root.querySelector('details')!;
    await open(details, () => fetcher.mock.calls.length, 0);
    expect(root.querySelector('[data-business-process-status]')!.textContent).toContain('暫時無法載入');
    details.open = false;
    await new Promise(resolve => setTimeout(resolve, 20));
    await open(details, () => fetcher.mock.calls.length, 1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(viewer.importXML).toHaveBeenCalledTimes(1);
  });

  it('switches from the gateway diagram to the backend diagram', async () => {
    const root = markup();
    const details = root.querySelector('details')!;
    details.insertAdjacentHTML('beforeend', '<select data-business-process-picker><option value="gateway">Gateway</option><option value="backend">Backend</option></select>');
    const viewer = { importXML: vi.fn().mockResolvedValue({}), get: () => ({ zoom: vi.fn() }), destroy: vi.fn() };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => '<definitions/>' });
    initBusinessProcess(root, { fetch: fetcher, createViewer: vi.fn().mockResolvedValue(viewer) });
    await open(details, () => fetcher.mock.calls.length, 0);
    const picker = details.querySelector('select')!;
    picker.value = 'backend';
    picker.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(viewer.importXML).toHaveBeenCalledTimes(2));
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([GATEWAY_BPMN_URL, BACKEND_BPMN_URL]);
    expect(viewer.destroy).toHaveBeenCalledOnce();
  });

  it('really hides the loading line: an author display rule must not override the hidden attribute', () => {
    const css = readFileSync('src/components/BusinessProcessDiagram.astro', 'utf8');
    expect(css).toMatch(/\.business-process-status\[hidden\]\s*\{\s*display:\s*none/);
  });

  it('caps the diagram box so it never grows huge on a wide screen', () => {
    const css = readFileSync('src/components/BusinessProcessDiagram.astro', 'utf8');
    expect(css).toMatch(/\.business-process-canvas\s*\{[^}]*max-width:\s*1100px/);
    expect(css).toMatch(/\.business-process-canvas\s*\{[^}]*height:\s*min\(/);
  });
});
