import { describe, expect, it } from 'vitest';
import { visibleNavItems } from '../../src/scripts/navigation/menu';

describe('primary navigation', () => {
  it('keeps learning public while keeping the palace behind admin access', () => {
    expect(visibleNavItems({ isLoggedIn: false, isAdmin: false })).toEqual(['learn']);
    expect(visibleNavItems({ isLoggedIn: true, isAdmin: false })).toEqual(['learn']);
    expect(visibleNavItems({ isLoggedIn: true, isAdmin: true })).toEqual(['learn', 'palais']);
  });

  it('does not expose the retired control room or wildland tabs', () => {
    expect(visibleNavItems({ isLoggedIn: true, isAdmin: true })).not.toContain('control');
    expect(visibleNavItems({ isLoggedIn: true, isAdmin: true })).not.toContain('wildland');
  });
});
