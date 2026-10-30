import { describe, expect, it } from 'vitest';
import { updateAuthNavLabel } from '../../src/scripts/navigation/authNavLanguage';

describe('authentication navigation language', () => {
  it('keeps the label and translation key aligned with authentication state', () => {
    const link = document.createElement('a');
    updateAuthNavLabel(link, false, 'zh');
    expect([link.textContent, link.dataset.i18n]).toEqual(['登入', 'nav.login']);
    updateAuthNavLabel(link, true, 'zh-TW');
    expect([link.textContent, link.dataset.i18n]).toEqual(['登出', 'nav.logout']);
    updateAuthNavLabel(link, false, 'en');
    expect([link.textContent, link.dataset.i18n]).toEqual(['Login', 'nav.login']);
  });
});
