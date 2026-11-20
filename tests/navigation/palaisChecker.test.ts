import { describe, expect, it } from 'vitest';
import { hasPalaisCheckerRole, visibleNavItems } from '../../src/scripts/navigation/menu';

describe('Palais Checker navigation', () => {
  it('exposes Palais to signed-in Checkers without requiring an admin role', () => {
    const token = 'header.' + btoa(JSON.stringify({ realm_access: { roles: ['palais-checker'] } })) + '.signature';
    expect(visibleNavItems({ isLoggedIn: true, isAdmin: false, isPalaisChecker: hasPalaisCheckerRole(token) }))
      .toEqual(['learn', 'palais']);
  });

  it('does not use malformed or client-scoped role claims', () => {
    const token = 'header.' + btoa(JSON.stringify({ resource_access: { other: { roles: ['palais-checker'] } } })) + '.signature';
    expect(hasPalaisCheckerRole(token)).toBe(false);
    expect(hasPalaisCheckerRole('malformed.???')).toBe(false);
    expect(visibleNavItems({ isLoggedIn: false, isAdmin: false, isPalaisChecker: true })).toEqual(['learn']);
  });
});
