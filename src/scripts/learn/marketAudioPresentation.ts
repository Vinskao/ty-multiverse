type AudioRevision = { productType: string; code: string; revision: number; voice?: string };

export type MarketAudioCardTitleInput = {
  productType: string;
  language: 'zh' | 'en';
  title?: string | null;
  presenterName?: string;
  test?: boolean;
  mayaPending?: boolean;
};

/** Heading of one Learn audio card. Daily episodes show their own title; older ones fall back to the presenter label. */
export function marketAudioCardTitle(input: MarketAudioCardTitleInput): string {
  const zh = input.language === 'zh';
  if (input.productType === 'macro') return zh ? '總經' : 'Macro';
  if (input.productType !== 'daily') return zh ? '個股' : 'Stock';
  const presenter = input.presenterName || 'Maya';
  const episodeTitle = input.title?.trim();
  const heading = !input.test && episodeTitle
    ? episodeTitle
    : `${presenter} ${input.test ? (zh ? '試音' : 'Voice Test') : (zh ? '每日精讀' : 'Daily Reading')}`;
  return input.mayaPending ? heading + (zh ? '（Uiobbeci 市場分析，Maya 待定）' : ' (Uiobbeci market analysis; Maya pending)') : heading;
}

export function marketAudioDay(day: string | undefined, language: 'zh' | 'en'): string | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00+08:00`);
  if (!Number.isFinite(date.getTime())) return null;
  const formatter = new Intl.DateTimeFormat(language === 'zh' ? 'zh-TW' : 'en-US', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: language === 'zh' ? 'numeric' : 'short', day: 'numeric',
  });
  if (language === 'zh') {
    const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}年${parts.month}月${parts.day}日（台北時間）`;
  }
  return `${formatter.format(date)} (Taipei time)`;
}

/** Only collapse versions of explicitly marked demo recordings. */
export function latestTestAudioRevisions<T extends AudioRevision>(items: T[]): T[] {
  const latest = new Map<string, number>();
  for (const item of items) {
    if (!item.voice?.startsWith('test:')) continue;
    const key = `${item.productType}\0${item.code}`;
    latest.set(key, Math.max(latest.get(key) ?? 0, item.revision));
  }
  return items.filter(item => !item.voice?.startsWith('test:')
    || item.revision === latest.get(`${item.productType}\0${item.code}`));
}

export function marketAudioDateTime(createdAt: string | undefined, language: 'zh' | 'en'): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) return null;
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Taipei', year: 'numeric', month: language === 'zh' ? 'numeric' : 'short',
    day: 'numeric', hour: 'numeric', minute: '2-digit', ...(language === 'zh' ? { hourCycle: 'h23' as const } : { hour12: true })
  };
  const formatter = new Intl.DateTimeFormat(language === 'zh' ? 'zh-TW' : 'en-US', options);
  if (language === 'zh') {
    const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}（台北時間）`;
  }
  return `${formatter.format(date)} (Taipei time)`;
}

/** Newest report day first; ties by creation time. Undated rows go last. */
export function newestMarketAudioFirst<T extends { day?: string; createdAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.day ?? '').localeCompare(a.day ?? '')
    || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}
