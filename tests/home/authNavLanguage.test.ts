import { describe, expect, it } from 'vitest';
import { isLoggedInAuthLink, updateAuthNavLabel } from '../../src/scripts/navigation/authNavLanguage';

describe('authentication navigation language', () => {
  it('keeps the label and translation key aligned when signed out', () => {
    const link = document.createElement('a');
    updateAuthNavLabel(link, false, 'zh');
    expect([link.textContent, link.dataset.i18n]).toEqual(['登入', 'nav.login']);
    updateAuthNavLabel(link, false, 'en');
    expect([link.textContent, link.dataset.i18n]).toEqual(['Login', 'nav.login']);
  });
  it('shows the full name while retaining an accessible logout action', () => {
    const link = document.createElement('a');
    updateAuthNavLabel(link, true, 'zh-TW', 'Ada Lovelace');
    expect(link.textContent).toBe('Ada Lovelace');
    expect(link.dataset.i18n).toBeUndefined();
    expect(link.getAttribute('aria-label')).toBe('登出');
  });
  it('falls back to the localized logout label when no name is available', () => {
    const link = document.createElement('a');
    updateAuthNavLabel(link, true, 'en');
    expect([link.textContent, link.dataset.i18n]).toEqual(['Logout', 'nav.logout']);
  });

  it('keeps the named auth link wired to logout without relying on its visible text', () => {
    const container = document.createElement('div');
    container.className = 'nav-auth';
    container.dataset.authLoggedIn = 'true';
    const link = document.createElement('a');
    link.dataset.authLink = '';
    link.textContent = 'Ada Lovelace';
    container.append(link);
    expect(isLoggedInAuthLink(link)).toBe(true);
    container.dataset.authLoggedIn = 'false';
    expect(isLoggedInAuthLink(link)).toBe(false);
  });
});
