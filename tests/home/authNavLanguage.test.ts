import { describe, expect, it } from 'vitest';
import { updateAuthNavLabel } from '../../src/scripts/navigation/authNavLanguage';

describe('authentication navigation language', () => {
  it('keeps the login label and translation key aligned', () => {
    const link = document.createElement('a');
    updateAuthNavLabel(link, false, 'zh');
    expect([link.textContent, link.dataset.i18n]).toEqual(['登入', 'nav.login']);
    updateAuthNavLabel(link, false, 'en');
    expect([link.textContent, link.dataset.i18n]).toEqual(['Login', 'nav.login']);
  });
});
