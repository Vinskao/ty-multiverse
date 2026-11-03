import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parseResearchRecord } from '../../src/scripts/market/researchMap';

const guide = readFileSync(resolve(__dirname, '../../public/research-guide.md'), 'utf8');
const page = readFileSync(resolve(__dirname, '../../src/pages/index.astro'), 'utf8');
const aiGuide = readFileSync(resolve(__dirname, '../../public/market-ai.md'), 'utf8');

it('makes the research SOP discoverable from Research and the existing AI instructions', () => {
  const research = page.slice(page.indexOf('data-market-panel="research"'), page.indexOf('data-market-panel="ai-analysis"'));
  expect(research).toContain('/research-guide.md');
  expect(page.slice(page.indexOf('id="market-ai-research-prompt-text"'))).toContain('https://tymultiverse.cc/research-guide.md');
  expect(aiGuide).toContain('https://tymultiverse.cc/research-guide.md');
});

it('keeps the documented JSON template compatible with the existing research renderer', () => {
  const json = guide.match(/```json\s*\n([\s\S]*?)\n```/)?.[1];
  expect(json).toBeTruthy();
  const record = parseResearchRecord(json!)!;
  expect(record).not.toBeNull();
  expect(record.lean).toBe('中立');
  expect(record.sources).toEqual([]);
  expect(record.basis).toContain('純模板');
});

it('preserves evidence, counterarguments and optimistic-concurrency instructions in the public prompt', () => {
  expect(guide).toContain('六項');
  expect(guide).toContain('最強反方');
  expect(guide).toContain('expectedRevision');
  expect(guide).toContain('409');
  expect(guide).toContain('不是高盛');
});

it('gives general ETFs an allocation-only exception with an explicit theme opt-in', () => {
  expect(guide).toContain('ETF 分支優先');
  expect(guide).toContain('kind: "etf"');
  expect(guide).toContain('themeResearch');
  expect(guide).toContain('部分披露不補成 100%');
  expect(page).toContain('一般 ETF 只顯示');
  expect(aiGuide).toContain('一般 ETF');
});

it('makes the first 200 characters of an analysis lead with new evidence and the rating change, not price action', () => {
  // 2026-11-03: the opening 200 characters are published on their own (Threads), and the live analyses opened with the data-cutoff header and price action.
  const rule = aiGuide.slice(aiGuide.indexOf('## 開頭 200 字規則'), aiGuide.indexOf('## Research quality SOP'));
  expect(rule.length).toBeGreaterThan(200);
  for (const must of ['新證據', '數字', '維持', '改變', '【結論】', '股價', 'MA', 'RSI', 'check_analysis_lead.py', '本輪沒有新證據']) {
    expect(rule, must).toContain(must);
  }
  expect(rule.indexOf('重點')).toBeLessThan(rule.indexOf('資料截點'));            // the insight line comes before the header line
  const prompt = page.slice(page.indexOf('id="market-ai-research-prompt-text"'));
  expect(prompt.slice(0, 9000)).toContain('開頭 200 字');                       // the copyable prompt points at the same rule
  expect(prompt.slice(0, 9000)).toContain('https://tymultiverse.cc/market-ai.md');
});
