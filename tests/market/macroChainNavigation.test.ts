import { afterEach, describe, expect, it, vi } from 'vitest';
import graph from '../../src/storages/macroLogicGraph.json';
import { chainScrollTarget } from '../../src/scripts/market/macroChainNavigation';
import { renderMacroChains } from '../../src/scripts/market/macroChainView';
import type { MacroGraph } from '../../src/scripts/market/macroChains';

afterEach(() => vi.restoreAllMocks());

describe('compact independent macro chains', () => {
  it('finds the adjacent stage from a partial swipe and clamps at either end', () => {
    expect(chainScrollTarget([0, 312, 624, 936], 120, 'next')).toBe(312);
    expect(chainScrollTarget([0, 312, 624, 936], 312, 'previous')).toBe(0);
    expect(chainScrollTarget([0, 312, 624, 936], 120, 'previous')).toBe(0);
    expect(chainScrollTarget([0, 312, 624, 936], 936, 'next')).toBe(936);
    expect(chainScrollTarget([], 0, 'next')).toBe(0);
  });

  it('puts each title above its own scroll region and keeps convergence first', () => {
    const root = document.createElement('div'); document.body.replaceChildren(root);
    renderMacroChains(root, { graph: graph as MacroGraph, zh: true, analyses: new Map(), chart: () => null });
    expect(root.firstElementChild?.querySelector('.macro-chain-overview')).not.toBeNull();
    const rows = [...root.querySelectorAll<HTMLElement>('.macro-chain-row')];
    expect(rows.map(row => row.dataset.chain)).toEqual(['inflation', 'rates', 'liquidity', 'growth', 'taiwan']);
    expect(root.querySelectorAll('.macro-chains-scroll')).toHaveLength(5);
    rows.forEach(row => {
      const scroll = row.querySelector<HTMLElement>('.macro-chains-scroll')!;
      expect(scroll).not.toBeNull();
      expect(scroll.querySelector('.macro-chain-head')).toBeNull();
      expect(scroll.getAttribute('aria-labelledby')).toBe(row.querySelector('h5')?.id);
      expect(row.querySelector('select')?.options.length).toBeGreaterThan(1);
    });
    // The Taiwan chain has only three stages, so it must not keep a phantom fourth column.
    expect(rows[4].querySelectorAll('.macro-chain-cell')).toHaveLength(3);
  });

  it('moves 01 alone and provides a direct jump to a distant indicator', () => {
    const root = document.createElement('div'); document.body.replaceChildren(root);
    const { drawEdges } = renderMacroChains(root, { graph: graph as MacroGraph, zh: true, analyses: new Map(), chart: () => null });
    const rows = [...root.querySelectorAll<HTMLElement>('.macro-chain-row')];
    const first = rows[0].querySelector<HTMLElement>('.macro-chains-scroll')!;
    const second = rows[1].querySelector<HTMLElement>('.macro-chains-scroll')!;
    Object.defineProperties(first, { clientWidth: { value: 300 }, scrollWidth: { value: 1248 } });
    [...first.querySelectorAll<HTMLElement>('.macro-node')].forEach((node, index) => vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ left: index * 312 } as DOMRect));
    const firstMove = vi.fn(); const secondMove = vi.fn();
    first.scrollTo = firstMove; second.scrollTo = secondMove;
    drawEdges();
    rows[0].querySelector<HTMLButtonElement>('[data-chain-next]')!.click();
    expect(firstMove).toHaveBeenCalledWith({ left: 312, behavior: 'smooth' });
    expect(secondMove).not.toHaveBeenCalled();
    expect(second.scrollLeft).toBe(0);
    const destination = root.querySelector<HTMLElement>('#macro-node-fed-policy')!;
    destination.scrollIntoView = vi.fn();
    const select = rows[0].querySelector('select')!;
    select.value = 'fed-policy'; select.dispatchEvent(new Event('change'));
    expect(firstMove).toHaveBeenLastCalledWith({ left: 936, behavior: 'smooth' });
    // A same-height card jump must keep the row heading and controls in view.
    expect(destination.scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(destination);
    expect(secondMove).not.toHaveBeenCalled();
  });
});
