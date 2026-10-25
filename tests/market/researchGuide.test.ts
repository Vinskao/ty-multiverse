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
  expect(page.slice(page.indexOf('id="market-ai-research-prompt-text"'))).toContain('/tymultiverse/research-guide.md');
  expect(aiGuide).toContain('/tymultiverse/research-guide.md');
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
