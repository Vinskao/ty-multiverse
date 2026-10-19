// Turns diary list summaries into a readable storyline and event metadata into prose parts.
// Pure so it is covered by tests/diary/narrative.test.ts; panel.ts only renders the result.

type Lang = 'zh' | 'en' | string;
export type StoryEntry = {
  id: string; entryDate: string | null; title: string; category?: string;
  datePrecision?: string; entryKind?: string; description?: string | null;
};
export type StoryItem = { id: string; date: string; title: string; text: string; category?: string };
export type StoryChapter = { heading: string; items: StoryItem[] };
export type EntryDetail = { description: string; notes: string | null; facts: string[]; tags: string[] };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthHeading(month: string, lang: Lang) {
  const [year, number] = month.split('-');
  return lang === 'en' ? `${MONTHS[Number(number) - 1]} ${year}` : `${year} 年 ${Number(number)} 月`;
}

function item(entry: StoryEntry, lang: Lang): StoryItem {
  const day = entry.entryDate ? entry.entryDate.slice(5).replace('-', '/') : '';
  const approximate = entry.entryDate && entry.datePrecision === 'approximate' ? (lang === 'en' ? 'Approx. ' : '約 ') : '';
  return { id: entry.id, date: `${approximate}${day}`, title: entry.title, text: entry.description?.trim() || entry.title, category: entry.category };
}

/** Events oldest to newest, one chapter per month, undated events last. Source documents are not events. */
export function buildNarrative(entries: StoryEntry[], lang: Lang): StoryChapter[] {
  const events = entries.filter((entry) => entry.entryKind !== 'document');
  const dated = events.filter((entry) => entry.entryDate)
    .sort((a, b) => a.entryDate!.localeCompare(b.entryDate!) || a.id.localeCompare(b.id));
  const chapters: StoryChapter[] = [];
  let month = '';
  for (const entry of dated) {
    if (entry.entryDate!.slice(0, 7) !== month) {
      month = entry.entryDate!.slice(0, 7);
      chapters.push({ heading: monthHeading(month, lang), items: [] });
    }
    chapters.at(-1)!.items.push(item(entry, lang));
  }
  const undated = events.filter((entry) => !entry.entryDate);
  if (undated.length) chapters.push({ heading: lang === 'en' ? 'Date unconfirmed' : '日期待確認', items: undated.map((entry) => item(entry, lang)) });
  return chapters;
}

/** Readable parts of an imported event; null when the raw Markdown is the better view (documents, odd metadata). */
export function entryDetail(entry: { entryKind?: string; metadataJson?: string | null }, lang: Lang): EntryDetail | null {
  if (entry.entryKind === 'document' || !entry.metadataJson) return null;
  let meta: Record<string, unknown>;
  try { meta = JSON.parse(entry.metadataJson); } catch { return null; }
  if (!meta || typeof meta !== 'object' || typeof meta.description !== 'string' || !meta.description.trim()) return null;
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  const labels: Array<[string, string, string]> = [['confidence', '可信度', 'Confidence'], ['status', '狀態', 'Status'], ['source_type', '來源', 'Source']];
  return {
    description: meta.description.trim(),
    notes: text(meta.notes),
    facts: labels.flatMap(([key, zh, en]) => { const value = text(meta[key]); return value ? [`${lang === 'en' ? en : zh}${lang === 'en' ? ': ' : '：'}${value}`] : []; }),
    tags: Array.isArray(meta.tags) ? meta.tags.filter((tag): tag is string => typeof tag === 'string' && !!tag.trim()) : [],
  };
}
