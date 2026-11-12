import i18nData from '../../storages/i18n.json';

export function isLogoutButton(button: Element | null): boolean {
  return button?.matches('[data-auth-logout]') === true &&
    button.closest<HTMLElement>('.nav-auth')?.dataset.authLoggedIn === 'true';
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

export function syncAuthNavControls(
  container: HTMLElement,
  loggedIn: boolean,
  language: string,
  fullName = '',
) {
  const loginLink = container.querySelector<HTMLElement>('[data-auth-link]');
  const name = container.querySelector<HTMLElement>('[data-auth-user-name]');
  const logoutButton = container.querySelector<HTMLButtonElement>('[data-auth-logout]');
  if (!loginLink || !name || !logoutButton) return;

  container.dataset.authLoggedIn = String(loggedIn);
  loginLink.hidden = loggedIn;
  name.hidden = !loggedIn;
  logoutButton.hidden = !loggedIn;
  name.textContent = fullName;
  updateAuthNavLabel(loginLink, false, language);

  const locale = language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  const logoutLabel = i18nData.nav.logout[locale];
  logoutButton.setAttribute('aria-label', logoutLabel);
  logoutButton.setAttribute('title', logoutLabel);
}
