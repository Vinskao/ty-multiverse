export function createDiaryClient(base: string, token: () => string | null, request: typeof fetch = fetch) {
  return async <T = any>(path: string, body?: unknown): Promise<T> => {
    const credential = token();
    if (!credential) throw new Error('請先登入以讀取私人日記。');
    const response = await request(`${base.replace(/\/$/, '')}/diary${path}`, {
      method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credential}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 401 || response.status === 403) throw new Error('請重新登入以存取私人日記。');
    if (response.status === 400) throw new Error('請檢查日期、標題與 MD 內容（最多 200,000 字元）。');
    if (!response.ok) throw new Error('日記服務暫時無法使用，請稍後重試。');
    return response.json();
  };
}

export function taipeiDate(now = new Date()): string {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

export function diaryEntryLabel(entry: { entryDate: string | null; title: string; category?: string; datePrecision?: string; entryKind?: string }, lang = 'zh'): string {
  const names: Record<string, string> = lang === 'en'
    ? { relationship: 'Relationship', investment: 'Investment', wellbeing: 'Wellbeing', general: 'General' }
    : { relationship: '感情', investment: '投資', wellbeing: '身心狀態', general: '一般' };
  const date = entry.entryDate ? `${entry.datePrecision === 'approximate' ? (lang === 'en' ? 'Approx. ' : '約 ') : ''}${entry.entryDate}` : (lang === 'en' ? 'Date unconfirmed' : '日期待確認');
  const source = entry.entryKind === 'document' ? (lang === 'en' ? 'Source · captured ' : '來源文件 · 收錄於 ') : '';
  return `${source}${date} · ${names[entry.category || 'general'] || entry.category} · ${entry.title}`;
}

export function exportPrompt(date: string): string {
  return `請將本對話中可取得的私人日記資料整理成一份 Markdown，整理日為 ${date}。\n保留事件實際日期、重要對話、我的感受、待追蹤事項與資料來源；分開標示「實際原話」「我的觀察」「未證實猜測」。不知道的日期不要猜。僅在確實可取得逐字內容時標為原話。\n明確列出整理涵蓋期間，以及無法存取的其他對話或遺漏資料。不要聲稱這是完整聊天備份，不要使用記憶補造逐字紀錄。請輸出可供私人日記匯入的完整 MD 文字。`;
}

/** ISO date from either "2026-10-18" or the [2026, 10, 18] array an unconfigured Java ObjectMapper writes. */
export function isoDate(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every((part) => Number.isInteger(part))) {
    const [year, month, day] = value as number[];
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}
