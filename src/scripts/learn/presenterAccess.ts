/** The backend validates the token and its manage-users role; errors fail closed. */
export async function canShowFullPresenter(
  token: string | null,
  request: typeof fetch,
  gatewayBase: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const response = await request(`${gatewayBase}/auth/admin`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Keep the current decision while rechecking the same token. A different token starts cropped. */
export function createPresenterAccess(check: (token: string) => Promise<boolean>) {
  let active: { token: string | null; allowed: boolean; pending?: Promise<boolean> } | undefined;
  return async (token: string | null, apply: (allowed: boolean) => void, refresh = true): Promise<void> => {
    const changed = !active || active.token !== token;
    if (changed) active = { token, allowed: false };
    const state = active!;
    apply(state.allowed);
    if (!token || (!refresh && !changed && !state.pending)) return;

    const pending = state.pending ??= check(token);
    const allowed = await pending;
    if (active !== state) return;
    state.allowed = allowed;
    if (state.pending === pending) state.pending = undefined;
    apply(allowed);
  };
}
