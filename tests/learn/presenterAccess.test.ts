import { describe, expect, it, vi } from 'vitest';
import { canShowFullPresenter, createPresenterAccess } from '../../src/scripts/learn/presenterAccess';

describe('presenter access', () => {
  it('keeps the video cropped without a login and never calls the server', async () => {
    const request = vi.fn();
    expect(await canShowFullPresenter(null, request, '/tymg')).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
  it('shows the full frame only when the authenticated admin check succeeds', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true });
    expect(await canShowFullPresenter('token', request, '/tymg')).toBe(true);
    expect(request).toHaveBeenCalledWith('/tymg/auth/admin', expect.objectContaining({ headers: { Authorization: 'Bearer token' } }));
    expect(await canShowFullPresenter('token', vi.fn().mockResolvedValue({ ok: false }), '/tymg')).toBe(false);
    expect(await canShowFullPresenter('token', vi.fn().mockRejectedValue(new Error('offline')), '/tymg')).toBe(false);
  });
});

describe('Learn presenter frame updates', () => {
  it('shares an in-flight check and never collapses confirmed frames during same-token refresh', async () => {
    let resolve!: (allowed: boolean) => void;
    const check = vi.fn().mockImplementation(() => new Promise<boolean>(done => { resolve = done; }));
    const sync = createPresenterAccess(check);
    const apply = vi.fn();
    const first = sync('admin', apply);
    const parallel = sync('admin', apply);
    expect(check).toHaveBeenCalledTimes(1);
    resolve(true);
    await Promise.all([first, parallel]);
    apply.mockClear();
    const refresh = sync('admin', apply);
    expect(apply).not.toHaveBeenCalledWith(false);
    resolve(true);
    await refresh;
    expect(apply.mock.calls).toEqual([[true], [true]]);
  });

  it('crops immediately on sign-out and discards the old token result', async () => {
    let resolve!: (allowed: boolean) => void;
    const sync = createPresenterAccess(() => new Promise(done => { resolve = done; }));
    const apply = vi.fn();
    const checking = sync('admin', apply);
    await sync(null, apply);
    resolve(true);
    await checking;
    expect(apply.mock.calls).toEqual([[false], [false]]);
  });

  it('applies the verified state to newly loaded cards without a request and crops on denial', async () => {
    const check = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const sync = createPresenterAccess(check);
    await sync('admin', vi.fn());
    const apply = vi.fn();
    await sync('admin', apply, false);
    expect(apply.mock.calls).toEqual([[true]]);
    expect(check).toHaveBeenCalledTimes(1);

    await sync('admin', apply);
    expect(apply.mock.calls).toEqual([[true], [true], [false]]);
  });
});
