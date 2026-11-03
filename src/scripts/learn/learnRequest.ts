/** Raised when a learning request is attempted without a login. */
export class LoginRequiredError extends Error {
  constructor() {
    super('請先登入才能使用測驗');
    this.name = 'LoginRequiredError';
  }
}

/**
 * The route and headers for a /learn API call. Quizzes need a login (2026-11-03: the anonymous /learn/public namespace
 * and its guest ids were removed), so a missing token is an error the page turns into a sign-in prompt, never a fallback.
 */
export function learningRequest(path: string, token: string | null | undefined) {
  if (!token) throw new LoginRequiredError();
  return { path, headers: {} as Record<string, string> };
}
