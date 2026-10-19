import { describe, expect, it } from 'vitest';
import { buildNarrative, entryDetail } from '../../src/scripts/diary/narrative';

// Shapes follow GET /diary/entries summaries and the importer's event metadata (scripts/import_private_diary.py).
const entries = [
  { id: 'new', entryDate: '2026-10-18', title: 'Later event', category: 'relationship', entryKind: 'event', datePrecision: 'day', description: 'Second thing happened.' },
  { id: 'doc', entryDate: '2026-10-19', title: 'source.md', category: 'relationship', entryKind: 'document', datePrecision: 'document', description: null },
  { id: 'undated', entryDate: null, title: '日期待確認 / 2026-10', category: 'relationship', entryKind: 'event', datePrecision: 'unknown', description: 'Sometime this month.' },
  { id: 'old', entryDate: '2025-11-13', title: 'First event', category: 'investment', entryKind: 'event', datePrecision: 'approximate', description: 'It started here.' },
  { id: 'same-month', entryDate: '2025-11-02', title: 'Earlier that month', category: 'investment', entryKind: 'event', datePrecision: 'day', description: null },
];

describe('diary narrative', () => {
  it('reads oldest to newest by month, leaves out source documents and ends with undated items', () => {
    const chapters = buildNarrative(entries, 'zh');
    expect(chapters.map((c) => c.heading)).toEqual(['2025 年 11 月', '2026 年 10 月', '日期待確認']);
    expect(chapters[0].items.map((i) => i.id)).toEqual(['same-month', 'old']);
    expect(chapters.flatMap((c) => c.items).some((i) => i.id === 'doc')).toBe(false);
    expect(chapters[2].items[0]).toMatchObject({ id: 'undated', date: '', text: 'Sometime this month.' });
  });

  it('labels approximate days and falls back to the title when there is no description', () => {
    const [november] = buildNarrative(entries, 'zh');
    expect(november.items[1]).toMatchObject({ date: '約 11/13', text: 'It started here.' });
    expect(november.items[0]).toMatchObject({ date: '11/02', text: 'Earlier that month' });
    expect(buildNarrative(entries, 'en')[0].heading).toBe('November 2025');
    expect(buildNarrative(entries, 'en')[0].items[1].date).toBe('Approx. 11/13');
  });

  it('is empty when only documents are listed', () => {
    expect(buildNarrative([entries[1]], 'zh')).toEqual([]);
  });
});

describe('entry detail', () => {
  it('turns event metadata into readable parts instead of a JSON dump', () => {
    const detail = entryDetail({
      entryKind: 'event',
      metadataJson: JSON.stringify({ description: 'What happened.', notes: 'From my side only.', confidence: 'high', status: 'reported', source_type: 'quoted_chat_report', tags: ['contact', 'boundary'] }),
    }, 'zh');
    expect(detail).toEqual({ description: 'What happened.', notes: 'From my side only.', facts: ['可信度：high', '狀態：reported', '來源：quoted_chat_report'], tags: ['contact', 'boundary'] });
  });

  it('returns null for source documents and unreadable metadata, so the raw Markdown is shown', () => {
    expect(entryDetail({ entryKind: 'document', metadataJson: '{"source_file":"a.md"}' }, 'zh')).toBeNull();
    expect(entryDetail({ entryKind: 'event', metadataJson: 'not json' }, 'zh')).toBeNull();
    expect(entryDetail({ entryKind: 'event', metadataJson: '{"notes":"no description"}' }, 'zh')).toBeNull();
  });

  it('ignores non-string tags and facts', () => {
    const detail = entryDetail({ entryKind: 'event', metadataJson: JSON.stringify({ description: 'x', tags: ['ok', 3, null], confidence: { level: 1 } }) }, 'en');
    expect(detail).toEqual({ description: 'x', notes: null, facts: [], tags: ['ok'] });
  });
});

describe('AI narratives in the storyline', () => {
  const ai = {
    entries: {
      old: { narrative: 'I was unsure and kept watching the cycle.', stale: false },
      new: { narrative: 'Written before the entry changed.', stale: true },
    },
    months: [{ month: '2025-11', narrative: 'November was about learning the market.', stale: false }],
  };

  it('prefers the AI narrative per event, marks it, and keeps the description where none exists', () => {
    const chapters = buildNarrative(entries, 'zh', ai);
    const november = chapters[0];
    expect(november.items[1]).toMatchObject({ id: 'old', text: 'I was unsure and kept watching the cycle.', ai: true, stale: false });
    expect(november.items[0]).toMatchObject({ id: 'same-month', text: 'Earlier that month', ai: false });
    expect(chapters[1].items[0]).toMatchObject({ id: 'new', ai: true, stale: true });
  });

  it('opens each month with its AI summary when there is one', () => {
    const chapters = buildNarrative(entries, 'zh', ai);
    expect(chapters[0].summary).toEqual({ text: 'November was about learning the market.', stale: false });
    expect(chapters[1].summary).toBeUndefined();
    expect(buildNarrative(entries, 'zh')[0].summary).toBeUndefined();
  });
});
