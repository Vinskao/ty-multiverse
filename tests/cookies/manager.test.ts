import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_CONSENT_STORAGE_KEY } from '../../src/scripts/cookies/consent';
import { mountCookieConsent } from '../../src/scripts/cookies/manager';

describe('cookie consent controls', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    } });
    localStorage.clear();
    document.body.innerHTML = `<div data-cookie-consent>
      <button data-cookie-gear aria-expanded="false"></button><section data-cookie-menu hidden></section>
      <button data-cookie-open-preferences></button><aside data-cookie-banner hidden></aside>
      <dialog data-cookie-dialog><input data-cookie-analytics type="checkbox"><input data-cookie-advertising type="checkbox"><button data-cookie-save></button><button data-cookie-close></button></dialog>
      <button data-cookie-accept></button><button data-cookie-reject></button>
    </div>`;
    const dialog = document.querySelector<HTMLDialogElement>('[data-cookie-dialog]')!;
    dialog.showModal = vi.fn(() => { dialog.open = true; });
    dialog.close = vi.fn(() => { dialog.open = false; });
  });

  it('shows the notice and opens preferences with ads enabled by default', () => {
    mountCookieConsent();
    expect(document.querySelector('[data-cookie-banner]')?.hidden).toBe(false);
    document.querySelector<HTMLButtonElement>('[data-cookie-gear]')!.click();
    expect(document.querySelector('[data-cookie-menu]')?.hidden).toBe(false);
    document.querySelector<HTMLButtonElement>('[data-cookie-open-preferences]')!.click();
    expect(document.querySelector<HTMLInputElement>('[data-cookie-advertising]')?.checked).toBe(true);
  });

  // 2026-11-10: anonymous usage statistics (the north star metric) are on by default, like advertising.
  it('keeps anonymous statistics on by default and when the notice is acknowledged', () => {
    mountCookieConsent();
    document.querySelector<HTMLButtonElement>('[data-cookie-open-preferences]')!.click();
    expect(document.querySelector<HTMLInputElement>('[data-cookie-analytics]')?.checked).toBe(true);
    document.querySelector<HTMLButtonElement>('[data-cookie-accept]')!.click();
    expect(JSON.parse(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)!)).toMatchObject({ advertising: true, analytics: true });
  });

  it('lets a reader turn statistics off in the preferences dialog', () => {
    mountCookieConsent();
    document.querySelector<HTMLButtonElement>('[data-cookie-open-preferences]')!.click();
    document.querySelector<HTMLInputElement>('[data-cookie-analytics]')!.checked = false;
    document.querySelector<HTMLButtonElement>('[data-cookie-save]')!.click();
    expect(JSON.parse(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)!)).toMatchObject({ advertising: true, analytics: false });
  });

  it('deletes the anonymous reader id as soon as statistics are turned off, on any page', () => {
    localStorage.setItem('tym-reader-id-v1', '0f8fad5b-d9cb-469f-a165-70867728950e');
    mountCookieConsent();
    document.querySelector<HTMLButtonElement>('[data-cookie-accept]')!.click();
    expect(localStorage.getItem('tym-reader-id-v1')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('[data-cookie-reject]')!.click();
    expect(localStorage.getItem('tym-reader-id-v1')).toBeNull();
  });

  it('saves the necessary-only choice and announces the updated preference', () => {
    mountCookieConsent();
    const changed = vi.fn();
    window.addEventListener('cookie-consent:changed', changed, { once: true });
    document.querySelector<HTMLButtonElement>('[data-cookie-reject]')!.click();
    expect(JSON.parse(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)!)).toMatchObject({ necessary: true, advertising: false, analytics: false });
    expect(changed).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-cookie-banner]')?.hidden).toBe(true);
  });

  it('does not show the notice again when an unsigned-in visitor returns', () => {
    const markup = document.body.innerHTML;
    mountCookieConsent();
    document.querySelector<HTMLButtonElement>('[data-cookie-reject]')!.click();
    document.body.innerHTML = markup;
    mountCookieConsent();
    expect(document.querySelector<HTMLElement>('[data-cookie-banner]')!.hidden).toBe(true);
    expect(JSON.parse(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)!).advertising).toBe(false);
  });

  it('remembers the acknowledged notice on a subsequent visit', () => {
    const markup = document.body.innerHTML;
    mountCookieConsent();
    document.querySelector<HTMLButtonElement>('[data-cookie-accept]')!.click();
    document.body.innerHTML = markup;
    mountCookieConsent();
    expect(document.querySelector<HTMLElement>('[data-cookie-banner]')!.hidden).toBe(true);
    expect(JSON.parse(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)!).advertising).toBe(true);
  });
});
