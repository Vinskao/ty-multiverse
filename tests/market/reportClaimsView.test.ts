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
