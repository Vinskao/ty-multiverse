import i18nData from '../../storages/i18n.json';

export function updateAuthNavLabel(link: HTMLElement, loggedIn: boolean, language: string) {
  const key = loggedIn ? 'logout' : 'login';
  const locale = language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  link.dataset.i18n = `nav.${key}`;
  link.textContent = i18nData.nav[key][locale];
}
