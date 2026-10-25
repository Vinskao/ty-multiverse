import { expect, it } from 'vitest';
import { addedNotice } from '../../src/scripts/market/customSelection';

it('says which new picks are being filled and analyzed, and nothing when none were added', () => {
  expect(addedNotice({ added: ['2408', '3081'] }, true)).toBe('已開始補抓 2408、3081 的歷史與財報資料，資料補齊後會自動產生第一份 AI 分析（約 5–15 分鐘）。');
  expect(addedNotice({ added: ['2408'] }, false)).toBe('Fetching history and financials for 2408; its first AI analysis starts once the data is in (about 5–15 minutes).');
  expect(addedNotice({ added: [] }, true)).toBe('');
  expect(addedNotice({}, true)).toBe(''); // a backend without the field
  expect(addedNotice(null, true)).toBe('');
});
