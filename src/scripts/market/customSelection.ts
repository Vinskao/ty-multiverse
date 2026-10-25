/** After saving custom picks: the server is filling new picks' data, then starts their first AI analysis. */
export function addedNotice(saved: { added?: unknown } | null | undefined, zh: boolean): string {
    const added = Array.isArray(saved?.added) ? saved.added.filter((code): code is string => typeof code === 'string') : [];
    if (!added.length) return '';
    return zh
        ? `已開始補抓 ${added.join('、')} 的歷史與財報資料，資料補齊後會自動產生第一份 AI 分析（約 5–15 分鐘）。`
        : `Fetching history and financials for ${added.join(', ')}; ${added.length > 1 ? 'their' : 'its'} first AI analysis starts once the data is in (about 5–15 minutes).`;
}
