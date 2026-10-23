import { describe, it, expect } from 'vitest';
import { automationNotice, type AutomationStatus } from '../../src/scripts/market/automationStatus';

// Shape returned by maya-sawa POST /market/automation/check (services/market_automation.py).
const stale: AutomationStatus = {
    ib: { authenticated: false, lastSeenAt: '2026-10-16T11:34:36+00:00', loginUrl: '' },
    runs: [
        { key: 'taiwan', sessionDate: '2026-10-19', state: 'waiting-ib' },
        { key: 'us', sessionDate: null, state: 'no-session' },
    ],
};

describe('automationNotice', () => {
    it('asks the owner to log in to IB when the session lapsed, with the last-seen Taipei time', () => {
        const notice = automationNotice(stale, 'zh')!;
        expect(notice.tone).toBe('warn');
        expect(notice.lines[0]).toContain('IB 未登入');
        expect(notice.lines[0]).toContain('10/16 19:34');
        expect(notice.lines).toContain('台股收盤後：等 IB 資料');
        expect(notice.lines.join(' ')).not.toContain('美股');  // no session waiting yet
        expect(notice.loginUrl).toBeNull();
        // One-step login script (maya-sawa ibkr-gateway/login.ps1) since 2026-10-23.
        expect(notice.loginHint).toContain('ibkr-gateway\\login.ps1');
    });

    it('stays hidden when IB is live and the scheduled run covers the session', () => {
        // maya-sawa reports "scheduled" when the cron run had fresh bars, so no catch-up is pending.
        expect(automationNotice({
            ib: { authenticated: true, lastSeenAt: '2026-10-19T13:20:00+00:00', loginUrl: '' },
            runs: [{ key: 'taiwan', sessionDate: '2026-10-19', state: 'scheduled' }, { key: 'us', sessionDate: null, state: 'no-session' }],
        }, 'zh')).toBeNull();
    });

    it('links straight to the login page once one is configured', () => {
        const notice = automationNotice({ ...stale, ib: { ...stale.ib, loginUrl: 'https://ibkr.example.com/' } }, 'en')!;
        expect(notice.loginUrl).toBe('https://ibkr.example.com/');
        expect(notice.loginHint).toBeNull();
        expect(notice.lines[0]).toContain('IB is not signed in');
    });

    it('reports fired and pending runs while IB is live, and links the fired session', () => {
        const notice = automationNotice({
            ib: { authenticated: true, lastSeenAt: '2026-10-19T10:00:00+00:00', loginUrl: '' },
            runs: [
                { key: 'taiwan', sessionDate: '2026-10-19', state: 'fired', sessionUrl: 'https://claude.ai/code/session_1' },
                { key: 'us', sessionDate: '2026-10-20', state: 'not-configured' },
            ],
        }, 'zh')!;
        expect(notice.tone).toBe('ok');
        expect(notice.lines).toEqual(['IB 已連線', '台股收盤後：已自動觸發 AI 分析', '美股與總經：尚未設定觸發 token']);
        expect(notice.links).toEqual([{ label: '台股收盤後', url: 'https://claude.ai/code/session_1' }]);
    });

    it('stays hidden when IB is live and nothing is waiting', () => {
        expect(automationNotice({
            ib: { authenticated: true, lastSeenAt: '2026-10-19T10:00:00+00:00', loginUrl: '' },
            runs: [{ key: 'taiwan', sessionDate: '2026-10-19', state: 'done' }, { key: 'us', sessionDate: null, state: 'no-session' }],
        }, 'zh')).toBeNull();
    });

    it('never links to a non-https session url', () => {
        const notice = automationNotice({
            ib: { authenticated: true, lastSeenAt: null, loginUrl: 'javascript:alert(1)' },
            runs: [{ key: 'taiwan', sessionDate: '2026-10-19', state: 'fired', sessionUrl: 'javascript:alert(1)' }],
        }, 'zh')!;
        expect(notice.links).toEqual([]);
    });
});
