import { describe, expect, it, vi } from 'vitest';
import { lazyLoader, memoizeAsync } from '../../src/scripts/lazy';
import { groupsForCode, type IndustryGroup } from '../../src/scripts/market/researchMap';

function fakeObserver() {
  let notify: (entries: Array<{ isIntersecting: boolean }>) => void = () => undefined;
  const disconnect = vi.fn();
  const factory = (callback: typeof notify) => { notify = callback; return { observe: vi.fn(), disconnect }; };
  return { factory, notify: (visible: boolean) => notify([{ isIntersecting: visible }]), disconnect };
}

describe('lazyLoader', () => {
  it('waits until the section is near the viewport, then loads exactly once', () => {
    const load = vi.fn();
    const observer = fakeObserver();
    const loader = lazyLoader(document.createElement('section'), load, { observer: observer.factory });
    expect(load).not.toHaveBeenCalled();
    observer.notify(false);
    expect(load).not.toHaveBeenCalled();
    observer.notify(true);
    observer.notify(true);
    expect(load).toHaveBeenCalledOnce();
    expect(loader.isLoaded()).toBe(true);
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('run() loads immediately (another feature needs the data) and only once', () => {
    const load = vi.fn();
    const loader = lazyLoader(document.createElement('section'), load, { observer: fakeObserver().factory });
    loader.run();
    loader.run();
    expect(load).toHaveBeenCalledOnce();
  });

  it('loads at once when there is no element or no IntersectionObserver', () => {
    const load = vi.fn();
    lazyLoader(null, load);
    expect(load).toHaveBeenCalledOnce();
  });

  it('cancel() stops watching without loading', () => {
    const load = vi.fn();
    const observer = fakeObserver();
    const loader = lazyLoader(document.createElement('section'), load, { observer: observer.factory });
    loader.cancel();
    expect(observer.disconnect).toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });
});

describe('memoizeAsync', () => {
  it('shares one request per key and retries after a failure', async () => {
    const request = vi.fn().mockResolvedValueOnce('a').mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('b2');
    const load = memoizeAsync(request);
    expect(await Promise.all([load('x'), load('x')])).toEqual(['a', 'a']);
    expect(request).toHaveBeenCalledTimes(1);
    await expect(load('y')).rejects.toThrow('down');
    expect(await load('y')).toBe('b2');
  });
});

describe('groupsForCode', () => {
  const groups: IndustryGroup[] = [
    { id: 'ai', name: { zh: 'AI', en: 'AI' }, diagram: null, members: [{ recordCode: '2330', market: 'TW', name: '台積電', role: 'foundry' }, { recordCode: '6857-JP', market: 'JP', name: 'Advantest', role: 'test' }] },
    { id: 'cpo', name: { zh: 'CPO', en: 'CPO' }, diagram: null, members: [{ recordCode: '3081', market: 'TW', name: '聯亞', role: 'laser' }] },
  ];
  it('picks the groups a record belongs to from the full list (one request instead of one per holding)', () => {
    expect(groupsForCode(groups, '2330').map((g) => g.id)).toEqual(['ai']);
    expect(groupsForCode(groups, '6857-JP').map((g) => g.id)).toEqual(['ai']);
    expect(groupsForCode(groups, '9999')).toEqual([]);
  });
});
