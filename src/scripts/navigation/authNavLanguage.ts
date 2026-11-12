import i18nData from '../../storages/i18n.json';

export function isLoggedInAuthLink(link: Element | null): boolean {
  return link?.matches('[data-auth-link]') === true &&
    link.closest<HTMLElement>('.nav-auth')?.dataset.authLoggedIn === 'true';
}

export function updateAuthNavLabel(link: HTMLElement, loggedIn: boolean, language: string, fullName?: string) {
  const key = loggedIn ? 'logout' : 'login';
  const locale = language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  if (loggedIn && fullName?.trim()) {
    link.removeAttribute('data-i18n');
    link.textContent = fullName.trim();
    link.setAttribute('aria-label', i18nData.nav.logout[locale]);
    link.setAttribute('title', i18nData.nav.logout[locale]);
    return;
  }

  link.dataset.i18n = `nav.${key}`;
  link.textContent = i18nData.nav[key][locale];
  if (loggedIn) {
    link.setAttribute('aria-label', i18nData.nav.logout[locale]);
    link.setAttribute('title', i18nData.nav.logout[locale]);
  } else {
    link.removeAttribute('aria-label');
    link.removeAttribute('title');
  }
}
