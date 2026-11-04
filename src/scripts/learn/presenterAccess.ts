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
    });
    return response.ok;
  } catch {
    return false;
  }
}
