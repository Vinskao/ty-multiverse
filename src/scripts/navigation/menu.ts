export type NavItem = 'learn' | 'palais';

export function visibleNavItems(access: { isLoggedIn: boolean; isAdmin: boolean }): NavItem[] {
  return access.isLoggedIn && access.isAdmin ? ['learn', 'palais'] : ['learn'];
}
