import { describe, expect, it } from 'vitest';
import { renderResearchReturnChart } from '../../src/scripts/market/researchEconomicsChart';

describe('research economics return chart', () => {
  it('renders a labeled return series with an exact keyboard and pointer readout', () => {
    document.body.innerHTML = '<div><svg id="chart"></svg><output id="readout"></output></div>';
    const svg = document.querySelector<SVGSVGElement>('#chart')!;
    const readout = document.querySelector<HTMLOutputElement>('#readout')!;

    renderResearchReturnChart(svg, readout, [
      { date: '2026-04-02', returnPercent: 0, cumulativeCostUsd: 0 },
      { date: '2026-04-03', returnPercent: 2.5, cumulativeCostUsd: 0 },
    ]);

    expect(svg.getAttribute('aria-label')).toMatch(/portfolio return/i);
    expect(svg.querySelectorAll('path')).toHaveLength(1);
    const points = svg.querySelectorAll<SVGCircleElement>('[data-return-point]');
    expect(points).toHaveLength(2);
    points[1].dispatchEvent(new FocusEvent('focus'));
    expect(readout.textContent).toContain('2026-04-03');
    expect(readout.textContent).toContain('2.50%');
  });

  it('clears stale marks when no portfolio baseline exists', () => {
    document.body.innerHTML = '<div><svg id="chart"><path /></svg><output id="readout">old</output></div>';
    const svg = document.querySelector<SVGSVGElement>('#chart')!;
    const readout = document.querySelector<HTMLOutputElement>('#readout')!;
    renderResearchReturnChart(svg, readout, []);
    expect(svg.querySelector('path')).toBeNull();
    expect(svg.getAttribute('aria-label')).toMatch(/unavailable/i);
    expect(readout.textContent).toMatch(/no daily portfolio/i);
  });

  it('localizes the chart readout for Chinese visitors', () => {
    document.body.innerHTML = '<div><svg id="chart"></svg><output id="readout"></output></div>';
    const svg = document.querySelector<SVGSVGElement>('#chart')!;
    const readout = document.querySelector<HTMLOutputElement>('#readout')!;
    renderResearchReturnChart(svg, readout, [
      { date: '2026-04-02', returnPercent: 0, cumulativeCostUsd: 0 },
    ], 'zh');
    expect(svg.getAttribute('aria-label')).toContain('投資組合報酬率');
    expect(readout.textContent).toContain('投資組合報酬率');
  });
});
