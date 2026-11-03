import { describe, it, expect, vi } from 'vitest';
import { loadReceipts, saveReceipts } from '../../src/scripts/notifications/receipts';

describe('account notification receipts', () => {
  it('loads saved receipts using the authenticated session', async () => {
    const request = vi.fn(async () => Response.json({ids: ['routine:42']}));
    expect(await loadReceipts('token', request as any, '/')).toEqual(['routine:42']);
    expect(new Headers(request.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer token');
  });
  it('reports failed saves so they can be retried', async () => {
    await expect(saveReceipts('token', ['routine:42'], vi.fn(async () => new Response('', {status: 503})) as any, '/')).rejects.toThrow();
  });
});
