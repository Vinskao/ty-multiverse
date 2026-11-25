import { expect, it, vi } from 'vitest';
import { reportClaimsDetails } from '../../src/scripts/market/reportClaimsView';
import type { MarketReport } from '../../src/scripts/market/reports';

it('groups approved claims by direction, shows their source weights and renders a safe Mermaid summary', async () => {
  const claims: MarketReport['claims'] = [
    { page: 1, segment: 'csp', direction: 'tailwind', claim: 'Capacity expansion' },
    { page: 2, segment: 'csp', direction: 'headwind', claim: 'Financing pressure' },
    { page: 3, segment: 'csp', direction: 'neutral', claim: 'click node href "https://example.com"' },
  ];
  const run = vi.fn(async () => {});
  const load = async () => ({ initialize: vi.fn(), run });
  const view = reportClaimsDetails([{ claims, id: 'report' } as MarketReport],
    new Map([['report', { weight: 0.5, ageDays: 90, cutoffDate: '2026-05-01', reason: null }]]), false, load);
  document.body.append(view);
  view.open = true;
  view.dispatchEvent(new Event('toggle'));
  expect(view.textContent).toContain('0.50×');
  expect(view.textContent).toContain('90 days');
  view.querySelector('select')!.value = 'headwind';
  view.querySelector('select')!.dispatchEvent(new Event('change'));
  expect(view.textContent).toContain('Financing pressure');
  expect(view.textContent).not.toContain('Capacity expansion');
  const chart = view.querySelector<HTMLDetailsElement>('details')!;
  chart.open = true;
  chart.dispatchEvent(new Event('toggle'));
  await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
  expect(chart.querySelector('pre')?.textContent).toContain('Headwind · 1 · 0.50');
  expect(chart.querySelector('pre')?.textContent).toContain('D0 --> C0["p.1 · Capacity expansion"]');
  expect(chart.querySelector('pre')?.textContent).toContain('D1 --> C1["p.2 · Financing pressure"]');
  expect(chart.querySelector('pre')?.textContent).toContain('#quot;https#58;#47;#47;example.com#quot;');
  view.remove();
});

it.each([
  [false, 'Zoom in diagram', 'Zoom out diagram', 'Reset diagram size'],
  [true, '放大圖表', '縮小圖表', '重設大小'],
] as const)('zooms the rendered diagram and resets it (zh=%s)', async (zh, zoomIn, zoomOut, resetZoom) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '1600');
  svg.setAttribute('viewBox', '0 0 1600 900');
  const run = vi.fn(async ({ nodes }: { nodes: HTMLElement[] }) => nodes[0].replaceChildren(svg));
  const view = reportClaimsDetails([], new Map(), zh, async () => ({ initialize: vi.fn(), run }));
  document.body.append(view);
  try {
    view.open = true;
    const chart = view.querySelector<HTMLDetailsElement>('details')!;
    chart.open = true;
    chart.dispatchEvent(new Event('toggle'));
    expect(chart.getAttribute('aria-busy')).toBe('true');
    expect(chart.querySelector('button')).toBeNull();
    await vi.waitFor(() => expect(chart.getAttribute('aria-busy')).toBeNull());

    const button = (label: string) =>
      chart.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    const viewport = chart.querySelector<HTMLElement>('.market-research-diagram-viewport')!;
    expect(viewport.tabIndex).toBe(0);
    expect(viewport.contains(svg)).toBe(true);
    expect(svg.style.width).toBe('1600px');
    button(zoomIn).click();
    expect(svg.style.width).toBe('2000px');
    button(zoomOut).click();
    expect(svg.style.width).toBe('1600px');
    button(zoomOut).click();
    expect(svg.style.width).toBe('1200px');
    button(resetZoom).click();
    expect(svg.style.width).toBe('1600px');
    expect(run).toHaveBeenCalledOnce();
  } finally {
    view.remove();
  }
});
