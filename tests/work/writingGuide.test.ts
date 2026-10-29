import { describe, expect, it } from 'vitest';
import { auditArticle, articleTemplate, WRITING_GUIDE } from '../../src/scripts/work/writingGuide';

// 2026-10-29: two posts (〈從資料到決策：TY Multiverse 近期研究平台工程紀錄〉 and 〈從技術筆記到可追溯的研究平台〉) read like
// development diaries: several topics, "決策一…六" headings, no code. The owner wants technical articles a person or another AI can
// act on, and a guide on the blog page so the next writer does not produce a diary again.
const front = (tags: string, title = '不加依賴的 OpenTimestamps') =>
  `---\nslug: x\ntitle: "${title}"\ndescription: d\ncategory: Software Engineering\ntags: [${tags}]\npublishDate: "2026-10-28T17:00:00+08:00"\n---\n`;
const code = '```ts\nconst a = 1;\n```\n';
const software = front('Software Engineering, Python') + [
  '## 問題\n輸入、輸出、限制。', '## 原理\n機制。', `## 實作\n${code}${code}`,
  '## 替代方案\n| 方案 | 取捨 |\n|---|---|\n| A | B |', '## 驗證\n`test_x`', '## 限制\n…', '## 參考資料\n- RFC',
].join('\n\n');

describe('the technical-article check', () => {
  it('accepts a single-topic software article with code, alternatives, verification and references', () => {
    expect(auditArticle(software)).toEqual([]);
  });

  it('rejects the development-diary shape the two October posts had', () => {
    const diary = front('Python, TypeScript', '從資料到決策：TY Multiverse 近期研究平台工程紀錄')
      + '## 背景：讓資料留下依據\n最近幾天的開發重心…\n\n## 決策一：以 Astro SSR 保留可讀內容\n…\n\n## 決策二：抽成可測試模組\n…\n\n## 下一步\n…';
    const problems = auditArticle(diary);
    expect(problems.some(p => p.includes('Software Engineering'))).toBe(true);
    expect(problems.some(p => p.includes('日記'))).toBe(true);
    expect(problems.some(p => p.includes('程式碼'))).toBe(true);
    expect(problems.some(p => p.includes('替代方案'))).toBe(true);
  });

  it('asks a quant finance article for a formula and a worked example instead of code', () => {
    const finance = front('Quant Finance, Valuation', '一次性項目稅後還原的本益比') + [
      '## 問題\n…', '## 定義與公式\n$$PE = P / EPS$$', '## 算例\n2330：…', '## 實作對應\n缺值…',
      '## 敏感度與反例\n…', '## 限制\n不是投資建議。', '## 參考資料\n- IFRS',
    ].join('\n\n');
    expect(auditArticle(finance)).toEqual([]);
    expect(auditArticle(finance.replace('$$PE = P / EPS$$', '本益比是股價除以盈餘。'))).toContain('Quant Finance 文章要有公式（$$…$$ 或程式碼區塊）');
  });

  it('gives the editor a template that already passes except for its placeholders', () => {
    expect(auditArticle(articleTemplate(new Date('2026-10-29T00:00:00Z')))).toEqual([]);
    expect(WRITING_GUIDE.purpose).toContain('AI');
  });
});
