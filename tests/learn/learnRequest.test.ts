import { describe, expect, it } from 'vitest';
import { learningRequest } from '../../src/scripts/learn/learnRequest';

describe('learning API routing', () => {
  const guestId = 'f04a1da2-e305-4f17-a85e-f727cf52d3ab';

  it('uses a stable public namespace and guest identity for signed-out learning', () => {
    expect(learningRequest('/learn/topics', null, guestId)).toEqual({
      path: '/learn/public/topics', headers: { 'X-Learn-Guest-Id': guestId },
    });
  });

  it('keeps authenticated learner and mentor APIs on the private routes', () => {
    expect(learningRequest('/learn/topics', 'token', guestId)).toEqual({ path: '/learn/topics', headers: {} });
    expect(learningRequest('/learn/mentor/overview', null, guestId)).toEqual({ path: '/learn/mentor/overview', headers: {} });
  });

  it('rejects malformed guest identities before sending a public request', () => {
    expect(() => learningRequest('/learn/topics', null, 'unknown')).toThrow('Invalid learn guest ID');
  });
});
