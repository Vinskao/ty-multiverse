import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { GET } from '../../src/pages/llms.txt';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

// 2026-11-15 (AI visibility W46): ChatGPT did not cite tymultiverse.cc for 台股研究工具 / 基金經理人 研究工具 /
// 台股 籌碼 分析 網站. llms.txt still described the site as a Java engineer's personal dashboard, so an AI agent that
// reads it learns nothing about what the site is or who it is for.
describe('llms.txt tells AI agents what the site is and who it is for', () => {
  const read = async () => (await GET({ url: new URL('https://tymultiverse.cc/llms.txt') } as never)).text();

  it('names the research site and its readers instead of a personal dashboard', async () => {
    const body = await read();
    expect(body.startsWith('# TY 市場研究室')).toBe(true);
    expect(body).not.toContain('Personal dashboard');
    expect(body).toContain('公開投資研究的統一入口');
    expect(body).toContain('基金經理人');
    expect(body).toContain('台股');
    expect(body).toContain('籌碼');
    expect(body).toContain('來源與頁碼');
  });

  it('links the machine-readable and public pages with absolute URLs', async () => {
    const body = await read();
    for (const path of ['/brief.md', '/brief.json', '/about', '/work', '/api-reference', '/sitemap.xml']) {
      expect(body).toContain(`https://tymultiverse.cc${path}`);
    }
  });

  it('does not claim services the site does not offer', async () => {
    const body = await read();
    expect(body).toContain('不提供策略回測、自動下單或獲利保證');
    expect(body).toContain('不構成投資建議');
  });
});

describe('home WebSite structured data', () => {
  it('describes the site and its audience', () => {
    const layout = source('src/layouts/BaseLayout.astro');
    expect(layout).toContain("description: '法說、財報、SEC 申報與公開研究頻道，由 AI 整理成附來源與頁碼的主張，連到標的、技術、供應鏈與總體經濟。'");
    expect(layout).toContain("audienceType: '基金經理人與專業投資人'");
  });
});
