export type NavItem = 'learn' | 'palais';

export function visibleNavItems(access: { isLoggedIn: boolean; isAdmin: boolean; isPalaisChecker?: boolean }): NavItem[] {
  return access.isLoggedIn && (access.isAdmin || access.isPalaisChecker) ? ['learn', 'palais'] : ['learn'];
}

const SECTION_KEYS: Record<string, string> = {
  reports: 'nav.reports',
  macro: 'nav.macro',
  stocks: 'nav.stocks',
  login: 'nav.login',
  work: 'nav.work',
  about: 'nav.about',
  'api-reference': 'nav.api',
  learn: 'nav.learn',
  palais: 'nav.palais',
};

/** The nav i18n key of the page being viewed, or null when the page is not in the menu. */
export function currentPageKey(pathname: string): string | null {
  const [, section = ''] = pathname.split('/');
  if (section === '' || section === 'index.html') return 'nav.home';
  return SECTION_KEYS[section] ?? null;
}

export function hasPalaisCheckerRole(token: string | null): boolean {
  try {
    const payload = token?.split('.')[1];
    if (!payload) return false;
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return Array.isArray(claims.realm_access?.roles) && claims.realm_access.roles.includes('palais-checker');
  } catch {
    return false;
  }
}