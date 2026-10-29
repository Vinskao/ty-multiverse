import { describe, expect, it } from 'vitest';
import { ensureLearnGuestId, publicLearnHeaders } from '../../src/scripts/learn/guestIdentity';

describe('anonymous learning identity', () => {
  it('persists one opaque UUID per browser and uses it only as a learning identity header', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) };
    const guestId = ensureLearnGuestId(storage, () => 'f04a1da2-e305-4f17-a85e-f727cf52d3ab');
    expect(guestId).toBe('f04a1da2-e305-4f17-a85e-f727cf52d3ab');
    expect(ensureLearnGuestId(storage, () => 'different')).toBe(guestId);
    expect(publicLearnHeaders(guestId)).toEqual({ 'X-Learn-Guest-Id': guestId });
  });

  it('replaces malformed local data with a UUID', () => {
    const store = new Map([['learn_guest_id', 'not-a-uuid']]);
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) };
    expect(ensureLearnGuestId(storage, () => 'f04a1da2-e305-4f17-a85e-f727cf52d3ab')).toBe('f04a1da2-e305-4f17-a85e-f727cf52d3ab');
  });
});
