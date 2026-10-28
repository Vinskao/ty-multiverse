import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TELEGRAM_BOT_URL, mountNotifications, telegramCopy } from '../../src/scripts/notifications/center';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

// 2026-10-28: the Telegram bot button moved from the nav controls into the bell, with a tooltip saying what the bot is for.
describe('Telegram bot button lives in the notification bell', () => {
  it('is no longer in the nav controls', () => {
    const nav = read('src/components/Nav.astro');
    expect(nav).not.toContain('telegram-bot-link');
    expect(nav).not.toContain('Open Telegram AI bot');
    expect(nav).not.toContain('reset-website-btn');
    expect(nav).not.toContain('initResetBtn');
  });

  it('is a link at the bottom of the bell panel, described by its tooltip', () => {
    const bell = read('src/components/NotificationCenter.astro');
    expect(bell).toContain(`href="${TELEGRAM_BOT_URL}"`);
    expect(bell).toContain('aria-describedby="telegram-tip"');
    expect(bell).toContain('id="telegram-tip"');
    expect(bell).toContain('role="tooltip"');
    expect(bell.indexOf('data-telegram-tip')).toBeGreaterThan(bell.indexOf('data-list'));
  });

  it('says what the bot does: scheduled-run highlights, send-only', () => {
    const zh = telegramCopy('zh');
    expect(zh.label).toBe('在 Telegram 收通知');
    for (const phrase of ['排程', '結論改變', '目標價', 'IB', '不會讀取你的訊息']) expect(zh.tip).toContain(phrase);
    expect(telegramCopy('en').tip).toContain('never reads your messages');
  });

  it('fills the label and tooltip in the reader\'s language when the bell is mounted', () => {
    document.body.innerHTML = `<div id="c"><button data-bell></button><span data-count></span><section data-panel hidden><button data-tab="all"></button><button data-tab="unread"></button><button data-read-all></button><ul data-list></ul><p data-empty></p><span data-telegram-label></span><div data-telegram-tip></div></section></div>`;
    const root = document.querySelector<HTMLElement>('#c')!;
    const cleanup = mountNotifications(root, 'owner', [], 'en');
    expect(root.querySelector('[data-telegram-label]')!.textContent).toBe('Get notifications on Telegram');
    expect(root.querySelector('[data-telegram-tip]')!.textContent).toContain('never reads your messages');
    cleanup();
  });
});
