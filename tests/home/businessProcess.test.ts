import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { BPMN_URL, initBusinessProcess } from '../../src/scripts/home/businessProcess';

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
  it('loads the backend BPMN only when opened, shows a spinner meanwhile and fits it to the box', async () => {
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
    expect(fetcher.mock.calls[0][0]).toBe(BPMN_URL);
    expect(BPMN_URL).toMatch(/\/api\/business-processes\.bpmn$/);
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

  it('caps the diagram box so it never grows huge on a wide screen', () => {
    const css = readFileSync('src/components/BusinessProcessDiagram.astro', 'utf8');
    expect(css).toMatch(/\.business-process-canvas\s*\{[^}]*max-width:\s*1100px/);
    expect(css).toMatch(/\.business-process-canvas\s*\{[^}]*height:\s*min\(/);
  });
});
