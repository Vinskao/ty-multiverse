import { describe, expect, it } from 'vitest';
import { userDisplayNameFromToken } from '../../src/scripts/navigation/userDisplayName';

function tokenFor(claims: Record<string, unknown>) {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `header.${payload}.signature`;
}

describe('user display name from identity token', () => {
  it('uses the provider full-name claim', () => {
    expect(userDisplayNameFromToken(tokenFor({ name: 'Ada Lovelace' }), 'ada@example.com')).toBe('Ada Lovelace');
  });
  it('combines given and family names when name is absent', () => {
    expect(userDisplayNameFromToken(tokenFor({ given_name: 'Ada', family_name: 'Lovelace' }), 'ada@example.com')).toBe('Ada Lovelace');
  });
  it('falls back to username when identity claims have no full name', () => {
    expect(userDisplayNameFromToken(tokenFor({ preferred_username: 'ada' }), 'ada@example.com')).toBe('ada@example.com');
  });
  it('handles malformed or absent tokens safely', () => {
    expect(userDisplayNameFromToken('not-a-token', 'ada@example.com')).toBe('ada@example.com');
    expect(userDisplayNameFromToken(null, null)).toBe('');
  });
});
