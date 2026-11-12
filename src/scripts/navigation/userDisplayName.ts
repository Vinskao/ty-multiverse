type IdentityClaims = {
  name?: unknown;
  given_name?: unknown;
  family_name?: unknown;
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function userDisplayNameFromToken(token: string | null, fallback: string | null): string {
  try {
    const payload = token?.split('.')[1];
    if (payload) {
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const claims = JSON.parse(new TextDecoder().decode(bytes)) as IdentityClaims;
      const name = nonEmptyString(claims.name);
      if (name) return name;

      const parts = [nonEmptyString(claims.given_name), nonEmptyString(claims.family_name)].filter(Boolean);
      if (parts.length) return parts.join(' ');
    }
  } catch {
    // Invalid or non-JWT tokens should not prevent navigation from rendering.
  }

  return nonEmptyString(fallback) || '';
}
