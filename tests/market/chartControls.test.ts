import { expect, it, vi } from 'vitest';
import { addChartControls, bindChartZoom, chartView } from '../../src/scripts/market/chartViewport';

it('changes calendar windows through accessible buttons, and consumes wheel zoom only on the chart', () => {
  const target = document.createElement('div');
  const dates = ['2020-01-01', '2025-01-01'];
  const redraw = vi.fn();
  addChartControls(target, 'controls-test', dates, redraw, true);
  const week = [...target.querySelectorAll('button')].find(b => b.textContent === '週')!;
  week.click();
  expect(chartView('controls-test', dates).window).toEqual({ start: '2024-12-26', end: '2025-01-01' });
  expect(redraw).toHaveBeenCalledOnce();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  bindChartZoom(svg, 'controls-test', dates, redraw);
  const event = new WheelEvent('wheel', { deltaY: -100, cancelable: true });
  svg.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(chartView('controls-test', dates).range).toBe('custom');
  expect(redraw).toHaveBeenCalledTimes(2);
});
