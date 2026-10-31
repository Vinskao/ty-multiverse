import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, CONTACT_TOPICS, composeLinks, contactTopic, mailText, mailtoHref } from '../../src/scripts/contact';

describe('contact identity', () => {
    it('uses the TY Multiverse domain mailbox everywhere', () => {
        expect(CONTACT_EMAIL).toBe('tianyikao@tymultiverse.cc');
    });
});

// A bare mailto does nothing on a computer without a mail app (reported 2026-10-26: "這些都不能點"),
// so every topic also opens web mail compose pages and can be copied as text.
describe('ways to send without a mail app', () => {
    it('opens Gmail and Outlook compose pages with the address, subject and template', () => {
        const links = composeLinks('data', 'zh');
        const gmail = new URL(links.gmail);
        expect(gmail.origin + gmail.pathname).toBe('https://mail.google.com/mail/');
        expect(gmail.searchParams.get('view')).toBe('cm');
        expect(gmail.searchParams.get('to')).toBe(CONTACT_EMAIL);
        expect(gmail.searchParams.get('su')).toBe('[TY 市場研究室] 資料整合');
        expect(gmail.searchParams.get('body')).toContain('資料更新頻率：');
        const outlook = new URL(links.outlook);
        expect(outlook.origin + outlook.pathname).toBe('https://outlook.live.com/mail/0/deeplink/compose');
        expect(outlook.searchParams.get('to')).toBe(CONTACT_EMAIL);
        expect(outlook.searchParams.get('subject')).toBe('[TY 市場研究室] 資料整合');
        expect(links.mailto).toBe(mailtoHref('data', 'zh'));
    });

    it('copies the recipient, subject and template as plain text', () => {
        const text = mailText('feature', 'en');
        expect(text.split('\n').slice(0, 2)).toEqual([`To: ${CONTACT_EMAIL}`, 'Subject: [TY Market Lab] Feature request']);
        expect(text).toContain('The problem I want to solve:');
        expect(mailText('feature', 'zh')).toContain('收件人：tianyikao@tymultiverse.cc\n主旨：[TY 市場研究室] 功能需求');
    });
});

describe('homepage contact', () => {
    it('opens a mail with a topic subject and a fill-in template, encoded so mail apps keep spaces and line breaks', () => {
        const href = mailtoHref('trial', 'zh');
        expect(href.startsWith(`mailto:${CONTACT_EMAIL}?subject=`)).toBe(true);
        const url = new URL(href);
        expect(url.searchParams.get('subject')).toBe('[TY 市場研究室] 申請試用');
        expect(url.searchParams.get('body')).toContain('目前的研究方式：');
        expect(href).not.toContain('+'); // RFC 6068: "+" would show up literally in Outlook / Apple Mail
        expect(href).toContain('%0A');
    });

    it('has an English subject and body for every topic', () => {
        for (const topic of CONTACT_TOPICS) {
            const url = new URL(mailtoHref(topic.id, 'en'));
            expect(url.searchParams.get('subject')).toMatch(/^\[TY Market Lab\] /);
            expect(url.searchParams.get('body')!.length).toBeGreaterThan(20);
        }
        expect(CONTACT_TOPICS.map(topic => topic.id)).toEqual(['trial', 'data', 'feature']);
    });

    it('falls back to the trial topic for unknown values and to Chinese for unknown languages', () => {
        expect(contactTopic('nope').id).toBe('trial');
        expect(mailtoHref('nope', 'fr')).toBe(mailtoHref('trial', 'zh'));
    });
});
