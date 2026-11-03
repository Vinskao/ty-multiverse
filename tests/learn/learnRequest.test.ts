import { describe, expect, it } from 'vitest';
import { learningRequest, LoginRequiredError } from '../../src/scripts/learn/learnRequest';

// 2026-11-03: the guest quizzes (/learn/public/**) are gone. /learn needs a login; every registered member has one.
describe('learning API routing', () => {
  it('sends a signed-in learner to the private routes, unchanged', () => {
    expect(learningRequest('/learn/topics', 'token')).toEqual({ path: '/learn/topics', headers: {} });
    expect(learningRequest('/learn/topics/q1/attempts', 'token')).toEqual({ path: '/learn/topics/q1/attempts', headers: {} });
    expect(learningRequest('/learn/mentor/overview', 'token')).toEqual({ path: '/learn/mentor/overview', headers: {} });
  });

  it('refuses to build a request without a login instead of falling back to an anonymous route', () => {
    for (const token of [null, '', undefined]) {
      expect(() => learningRequest('/learn/topics', token as string | null)).toThrow(LoginRequiredError);
    }
    expect(() => learningRequest('/learn/profile', null)).toThrow(LoginRequiredError);
  });

  it('never produces a public path, whatever the input', () => {
    for (const path of ['/learn/topics', '/learn/attempts', '/learn/topics/q/session', '/learn/public/topics']) {
      expect(learningRequest(path, 'token').path.startsWith('/learn/public/') && !path.startsWith('/learn/public/')).toBe(false);
    }
  });

  it('tells the page what to show: the error is recognisable and its message asks for a login', () => {
    const error = new LoginRequiredError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('LoginRequiredError');
    expect(error.message).toContain('登入');
  });
});
