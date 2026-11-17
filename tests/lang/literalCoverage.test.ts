import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import dict from '../../src/storages/literalEn.json';
import { translateLiteral } from '../../src/scripts/lang/literal';

// Every Chinese string a tab writes itself (markup text, aria/title attributes, string and template literals in its
// script) must have an English entry, so adding a Chinese-only string to these pages fails here instead of in English mode.
// The extraction is deliberately simple (it skips fragments that look like code), so it is a safety net, not a parser.
const CJK = /[\u4e00-\u9fff]/;
const read = (file: string) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

function literals(source: string): string[] {
  const body = source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found: string[] = [];
  for (const match of body.matchAll(/>([^<>{}"`;]*[\u4e00-\u9fff][^<>{}"`;]*)</g)) found.push(match[1]);
  for (const match of body.matchAll(/(?:aria-label|title|placeholder)="([^"]*[\u4e00-\u9fff][^"]*)"/g)) found.push(match[1]);
  for (const match of body.matchAll(/"([^"\n;{}<>]*[\u4e00-\u9fff][^"\n;{}<>]*)"/g)) found.push(match[1]);
  for (const match of body.matchAll(/`([^`;]*[\u4e00-\u9fff][^`;]*)`/g)) found.push(match[1]);
  return found
    .map((text) => text.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, '1').replace(/\s+/g, ' ').trim())
    .filter((text) => CJK.test(text) && !/[?{}]|\s:\s/.test(text) && !text.includes('console.'));
}

describe('English coverage of the Chinese-written tabs', () => {
  for (const file of ['src/pages/learn.astro', 'src/pages/api-reference.astro']) {
    it(`${file} has an English entry for every Chinese string`, () => {
      const missing = [...new Set(literals(read(file)))].filter((text) => CJK.test(translateLiteral(text, dict)));
      expect(missing).toEqual([]);
    });
  }
  it('the sign-in redirect message is covered', () => {
    expect(translateLiteral('正在跳轉到登入頁面...', dict)).toBe('Redirecting to the sign-in page...');
  });
});

// 2026-11-17: the home page and its components also need English. Strings written before this guard existed are listed in
// literalBaseline.json (admin panels, game widgets, text that is deliberately Chinese such as AI prompts); anything NOT in
// that list must have an English entry, so a new feature that adds Chinese text without a translation fails here.
describe('English coverage of the home page and components (new strings only)', () => {
  const baseline = JSON.parse(read('tests/lang/literalBaseline.json')) as Record<string, string[]>;
  const files = ['src/pages/index.astro', ...readdirSync('src/components').filter((name) => /\.(astro|tsx)$/.test(name)).map((name) => `src/components/${name}`)];
  for (const file of files) {
    it(`${file} adds no untranslated Chinese string`, () => {
      const known = new Set(baseline[file] ?? []);
      const missing = [...new Set(literals(read(file)))].filter((text) => CJK.test(translateLiteral(text, dict)) && !known.has(text));
      expect(missing, `Add English for these to src/storages/literalEn.json (or data-i18n): ${missing.join(' | ')}`).toEqual([]);
    });
  }
});
