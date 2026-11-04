import { describe, expect, it, vi } from 'vitest';
import { canShowFullPresenter } from '../../src/scripts/learn/presenterAccess';

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
