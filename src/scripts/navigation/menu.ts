export type NavItem = 'learn' | 'palais';

export function visibleNavItems(access: { isLoggedIn: boolean; isAdmin: boolean }): NavItem[] {
  return access.isLoggedIn && access.isAdmin ? ['learn', 'palais'] : ['learn'];
}

const SECTION_KEYS: Record<string, string> = {
  login: 'nav.login',
  work: 'nav.work',
  about: 'nav.about',
  'api-reference': 'nav.api',
  learn: 'nav.learn',
  palais: 'nav.palais',
};

/** The nav i18n key of the page being viewed, or null when the page is not in the menu. */
export function currentPageKey(pathname: string): string | null {
  const [, base, section = ''] = pathname.split('/');
  if (base !== 'tymultiverse') return null;
  if (section === '' || section === 'index.html') return 'nav.home';
  return SECTION_KEYS[section] ?? null;
}
