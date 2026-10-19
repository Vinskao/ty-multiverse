// IB session and analysis-routine status for the signed-in owner; covered by tests/market/automationStatus.test.ts.
// maya-sawa POST /market/automation/check fires a routine once its markets closed and IBKR bars arrived,
// so the only manual step left is the daily IB login this notice reminds about.

export type AutomationRun = { key: string; sessionDate: string | null; state: string; sessionUrl?: string };
export type AutomationStatus = { ib: { authenticated: boolean; lastSeenAt: string | null; loginUrl: string }; runs: AutomationRun[] };
export type AutomationNotice = {
    tone: 'warn' | 'ok'; lines: string[]; loginUrl: string | null; loginHint: string | null;
    links: Array<{ label: string; url: string }>;
};

type Lang = 'zh' | 'en';
const RUN_LABELS: Record<string, Record<Lang, string>> = {
    taiwan: { zh: '台股收盤後', en: 'After the Taiwan close' },
    us: { zh: '美股與總經', en: 'US close and macro' },
};
const STATE_TEXT: Record<string, Record<Lang, string>> = {
    'waiting-ib': { zh: '等 IB 資料', en: 'waiting for IB data' },
    fired: { zh: '已自動觸發 AI 分析', en: 'AI analysis started' },
    'not-configured': { zh: '尚未設定觸發 token', en: 'fire token not set up' },
    error: { zh: '觸發失敗，稍後自動重試', en: 'start failed, will retry' },
};
const LOGIN_HINT = 'kubectl port-forward deployment/ibkr-gw 5000:5000 -n default → https://localhost:5000';
const https = (url: string | undefined) => (url && /^https:\/\//.test(url) ? url : null);

function taipeiTime(iso: string | null) {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(date).map((part) => [part.type, part.value]));
    return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

export function automationNotice(status: AutomationStatus, lang: Lang): AutomationNotice | null {
    const runs = status.runs.filter((run) => STATE_TEXT[run.state]);
    if (status.ib.authenticated && !runs.length) return null;
    const seen = taipeiTime(status.ib.lastSeenAt);
    const head = status.ib.authenticated
        ? (lang === 'zh' ? 'IB 已連線' : 'IB is connected')
        : lang === 'zh'
            ? `IB 未登入${seen ? `（最後連線 ${seen}）` : ''}，登入後約 5 分鐘會收集日韓美資料並自動觸發 AI 分析`
            : `IB is not signed in${seen ? ` (last seen ${seen})` : ''}; after login, data is collected in about 5 minutes and the AI analysis starts automatically`;
    const label = (key: string) => RUN_LABELS[key]?.[lang] ?? key;
    const loginUrl = status.ib.authenticated ? null : https(status.ib.loginUrl);
    return {
        tone: status.ib.authenticated ? 'ok' : 'warn',
        lines: [head, ...runs.map((run) => `${label(run.key)}${lang === 'zh' ? '：' : ': '}${STATE_TEXT[run.state][lang]}`)],
        loginUrl,
        loginHint: status.ib.authenticated || loginUrl ? null : LOGIN_HINT,
        links: runs.flatMap((run) => (run.state === 'fired' && https(run.sessionUrl) ? [{ label: label(run.key), url: run.sessionUrl! }] : [])),
    };
}
