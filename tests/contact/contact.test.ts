import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, CONTACT_TOPICS, contactTopic, mailtoHref } from '../../src/scripts/contact';

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
