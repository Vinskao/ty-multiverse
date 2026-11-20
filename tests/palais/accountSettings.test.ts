import { afterEach, describe, expect, it, vi } from 'vitest';
import { initPalaisAccountSettings } from '../../src/scripts/palais/accountSettings';

const layout = () => {
  document.body.innerHTML = `<section>
    <p id="access-status"></p>
    <form id="access-apply" hidden><textarea id="access-reason"></textarea><button>Apply</button></form>
    <div id="access-requests"></div><div id="access-queue"></div><div id="access-audit"></div>
  </section>`;
  vi.spyOn(localStorage, 'getItem').mockImplementation(key => key === 'token' ? 'fixture' : null);
  document.documentElement.lang = 'en';
};

const json = (body: unknown) => new Response(JSON.stringify(body), {
  headers: { 'content-type': 'application/json' },
});

afterEach(() => {
  document.dispatchEvent(new Event('astro:before-swap'));
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Palais account settings', () => {
  it('lets a Maker submit their reason and shows the saved application', async () => {
    layout();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ checker: false, administrator: false, requests: [] }))
      .mockResolvedValueOnce(json({ id: 'fixture' }))
      .mockResolvedValueOnce(json({ checker: false, administrator: false, requests: [{
        id: 'fixture', display_name: 'Maker', status: 'PENDING', reason: 'Review request',
        approvals: 0, approvals_required: 1, created_at: '2026-10-10T00:00:00Z',
      }] }));
    vi.stubGlobal('fetch', fetcher);
    initPalaisAccountSettings();
    const form = document.querySelector<HTMLFormElement>('form')!;
    await vi.waitFor(() => expect(form.hidden).toBe(false));
    document.querySelector('textarea')!.value = 'Review request';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(document.querySelector('#access-requests')!.textContent).toContain('Review request'));
    expect(fetcher.mock.calls[1][1].body).toBe(JSON.stringify({ reason: 'Review request' }));
    expect(form.hidden).toBe(true);
    expect(fetcher.mock.calls.every(([url]) => !url.endsWith('/review-queue?offset=0'))).toBe(true);
  });

  it('lets a Checker confirm and approve a pending application', async () => {
    layout();
    const application = {
      id: 'fixture', display_name: 'Maker', status: 'PENDING', reason: 'Review request',
      approvals: 0, approvals_required: 1, created_at: '2026-10-10T00:00:00Z',
    };
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('/me')) return json({ checker: true, administrator: false, canDecide: true, requests: [] });
      if (url.endsWith('/approve')) return new Response(null);
      return json([application]);
    });
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('confirm', () => true);
    initPalaisAccountSettings();
    const queue = document.querySelector('#access-queue')!;
    await vi.waitFor(() => expect(queue.textContent).toContain('Review request'));
    [...queue.querySelectorAll('button')].find(el => el.textContent === 'Approve')!.click();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/\/requests\/fixture\/approve$/), expect.objectContaining({ method: 'POST' }),
    ));
  });
});
