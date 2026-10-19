import { describe, it, expect, vi } from 'vitest';
import { createDiaryClient, diaryEntryLabel, taipeiDate, exportPrompt } from '../../src/scripts/diary/client';

describe('private diary client', () => {
  it('distinguishes event dates, approximate dates and document capture dates', () => {
    expect(diaryEntryLabel({ entryDate: null, title: 'Test', category: 'relationship' })).toContain('日期待確認');
    expect(diaryEntryLabel({ entryDate: '2026-10-18', title: 'Test', category: 'investment', datePrecision: 'approximate' })).toContain('約 2026-10-18 · 投資');
    expect(diaryEntryLabel({ entryDate: '2026-10-19', title: 'Test', entryKind: 'document' }, 'en')).toContain('Source · captured 2026-10-19');
  });
  it('never sends a request without a token and never adds username ownership', async () => {
    const request = vi.fn();
    const missing = createDiaryClient('/tymb', () => null, request);
    await expect(missing('/entries')).rejects.toThrow('登入');
    expect(request).not.toHaveBeenCalled();
    request.mockResolvedValue(new Response(JSON.stringify({ pending: true })));
    const client = createDiaryClient('/tymb/', () => 'verified-token', request);
    expect(await client('/check-in', {})).toEqual({ pending: true });
    expect(request).toHaveBeenCalledWith('/tymb/diary/check-in', expect.objectContaining({
      method: 'POST', cache: 'no-store', headers: expect.objectContaining({ Authorization: 'Bearer verified-token' }),
    }));
  });
  it('does not expose backend errors or private payloads in UI errors', async () => {
    const request = vi.fn().mockResolvedValue(new Response('secret content', { status: 500 }));
    await expect(createDiaryClient('/tymb', () => 'token', request)('/entries')).rejects.toThrow('日記服務暫時無法使用');
    request.mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(createDiaryClient('/tymb', () => 'token', request)('/entries')).rejects.toThrow('重新登入');
  });
  it('uses Taipei calendar dates and asks for source limits rather than invented transcripts', () => {
    expect(taipeiDate(new Date('2026-10-18T16:30:00Z'))).toBe('2026-10-19');
    const prompt = exportPrompt('2026-10-19');
    expect(prompt).toContain('未證實');
    expect(prompt).toContain('無法存取');
    expect(prompt).toContain('2026-10-19');
  });
});

describe('isoDate', () => {
  it('normalizes ISO strings, Java date arrays and missing dates', async () => {
    const { isoDate } = await import('../../src/scripts/diary/client');
    expect(isoDate('2026-10-18')).toBe('2026-10-18');
    expect(isoDate([2025, 11, 3])).toBe('2025-11-03');
    expect(isoDate(null)).toBeNull();
    expect(isoDate(['2025', 11, 3])).toBeNull();
    expect(isoDate([2025, 11])).toBeNull();
  });
});
