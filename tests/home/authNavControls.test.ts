import { describe, expect, it } from 'vitest';
import { isLogoutButton, syncAuthNavControls } from '../../src/scripts/navigation/authNavLanguage';

function navAuth() {
  const container = document.createElement('div');
  container.className = 'nav-auth';
  container.innerHTML = '<a data-auth-link></a><span data-auth-user-name hidden></span><button data-auth-logout hidden></button>';
  return container;
}

describe('authenticated navigation controls', () => {
  it('shows the full name and logout button only while signed in', () => {
    const container = navAuth();
    syncAuthNavControls(container, true, 'zh-TW', '千秋 吉國');
    expect(container.querySelector('[data-auth-user-name]')?.textContent).toBe('千秋 吉國');
    expect((container.querySelector('[data-auth-user-name]') as HTMLElement).hidden).toBe(false);
    expect((container.querySelector('[data-auth-logout]') as HTMLButtonElement).hidden).toBe(false);
    expect((container.querySelector('[data-auth-link]') as HTMLAnchorElement).hidden).toBe(true);

    syncAuthNavControls(container, false, 'zh-TW');
    expect((container.querySelector('[data-auth-user-name]') as HTMLElement).hidden).toBe(true);
    expect((container.querySelector('[data-auth-logout]') as HTMLButtonElement).hidden).toBe(true);
    expect((container.querySelector('[data-auth-link]') as HTMLAnchorElement).hidden).toBe(false);
  });

  it('labels the icon button as logout for assistive technology', () => {
    const container = navAuth();
    syncAuthNavControls(container, true, 'en', 'Ada Lovelace');
    expect(container.querySelector('[data-auth-logout]')?.getAttribute('aria-label')).toBe('Logout');
  });

  it('recognizes the separate logout button only while signed in', () => {
    const container = navAuth();
    syncAuthNavControls(container, true, 'en', 'Ada Lovelace');
    const button = container.querySelector('[data-auth-logout]');
    expect(isLogoutButton(button)).toBe(true);
    syncAuthNavControls(container, false, 'en');
    expect(isLogoutButton(button)).toBe(false);
  });
});
