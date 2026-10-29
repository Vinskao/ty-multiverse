/** The blog's writing contract, shown on /work and /work/manage, and the check the editor runs before publishing.
 *  Written for the next writer, human or AI: an article must let a reader maintain or rebuild the thing it describes,
 *  not tell them what happened this week. Two diary-shaped posts in October 2026 prompted it. */
export const WRITING_GUIDE = {
  title: '撰稿規範（給人與 AI） / Writing guide for humans and AI',
  purpose: '每篇文章的讀者是之後要維護或仿作的人和 AI：讀完就能少走彎路，直接動手。不是開發日記、週報或發布清單。',
  rules: [
    '一篇只講一個技術問題，標題寫成具體的問題或機制（例：「不加依賴的 OpenTimestamps」），不要寫「近期開發紀錄」。',
    '只能是兩類之一，標籤第一個寫類別：Software Engineering（演算法、資料結構、資料庫、並行、協定、建置、測試）或 Quant Finance（一個指標或方法）。',
    'Software Engineering 段落依序：問題（輸入、輸出、限制、一個真實失敗案例）→ 原理（附一手來源）→ 實作（至少兩段真實程式碼，標路徑與 commit，寫不變式或複雜度）→ 替代方案（表格，至少兩個）→ 驗證（測試名稱、red→green）→ 限制 → 參考資料。',
    'Quant Finance 段落依序：問題（常見做法為何失真）→ 定義與公式（單位、頻率、公布時差）→ 用公開資料的逐步算例 → 實作對應（缺值、修正、時區、前視偏誤）→ 敏感度與反例 → 限制（不是投資建議）→ 參考資料。',
    '加一段「踩過的坑」或檢查清單：別人最可能卡住的地方，以及怎麼避開。',
    '數字、測試數、上線狀態都要能核對；計畫、程式完成、測試通過、正式上線分開寫。',
  ],
  forbidden: [
    '「決策一、決策二…」「最近幾天」「本週」「下一步」這類日記結構。',
    '一篇拼多個主題；沒有程式碼或公式；「更穩定」「提升體驗」這類無法驗證的形容。',
    '金鑰、帳戶資料、內網位址、私人報告。',
  ],
} as const;

const DIARY = /開發紀錄|工程紀錄|研究室開發|近期|最近幾天|本週|決策[一二三四五六七八九十]|下一步/;
const SECTIONS = {
  'Software Engineering': [['問題'], ['原理', '機制'], ['實作'], ['替代方案'], ['驗證'], ['限制'], ['參考資料']],
  'Quant Finance': [['問題'], ['定義', '公式'], ['算例'], ['實作'], ['敏感度', '反例'], ['限制'], ['參考資料']],
} as const;

function frontmatter(markdown: string): { title: string; tags: string[]; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
  const head = match?.[1] ?? '';
  const title = /^title:\s*"?(.*?)"?\s*$/m.exec(head)?.[1] ?? '';
  const inline = /^tags:\s*\[(.*)\]\s*$/m.exec(head)?.[1];
  const tags = inline !== undefined ? inline.split(',')
    : [...(/^tags:\s*\r?\n((?:\s+-\s.*\r?\n?)+)/m.exec(head)?.[1] ?? '').matchAll(/-\s*(.+)/g)].map(m => m[1]);
  return { title, tags: tags.map(tag => tag.trim().replace(/^["']|["']$/g, '')).filter(Boolean), body: markdown.slice(match?.[0].length ?? 0) };
}

/** Problems that make a post a diary rather than a technical article; empty when it meets the guide. */
export function auditArticle(markdown: string): string[] {
  const { title, tags, body } = frontmatter(markdown);
  const kind = tags[0] as keyof typeof SECTIONS;
  const problems: string[] = [];
  if (!(kind in SECTIONS)) problems.push('第一個標籤要是 Software Engineering 或 Quant Finance');
  const headings = [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map(m => m[1]);
  if (DIARY.test(title) || headings.some(h => DIARY.test(h))) problems.push('標題或段落像開發日記（決策一、近期、下一步…）；改寫成單一技術問題');
  const required = SECTIONS[kind] ?? SECTIONS['Software Engineering'];
  const missing = required.filter(names => !headings.some(h => names.some(name => h.includes(name)))).map(names => names.join('／'));
  if (missing.length) problems.push(`缺少段落：${missing.join('、')}`);
  if (!headings.some(h => h.includes('替代方案')) || !/^\|.*\|\s*$/m.test(body)) {
    if (kind !== 'Quant Finance') problems.push('替代方案要用表格比較至少兩個做法');
  }
  const fences = (body.match(/^```/gm) ?? []).length / 2;
  if (kind === 'Quant Finance') {
    if (!/\$\$[\s\S]+?\$\$/.test(body) && fences < 1) problems.push('Quant Finance 文章要有公式（$$…$$ 或程式碼區塊）');
  } else if (fences < 2) {
    problems.push('Software Engineering 文章要有至少兩段真實程式碼');
  }
  return problems;
}

/** The "new article" skeleton in the editor, already in the required order. */
export function articleTemplate(now: Date): string {
  return `---
slug: new-article
title: "一句話寫出要解決的技術問題"
description: "讀者讀完能做什麼：解決哪個問題、用什麼機制、怎麼驗證。"
category: Software Engineering
tags: [Software Engineering]
publishDate: "${now.toISOString()}"
---

## 問題

輸入、輸出、限制，以及一個真實失敗案例。

## 原理

機制與一手來源。

## 實作

\`\`\`ts
// 真實程式碼，標明 repo 路徑與 commit
\`\`\`

\`\`\`ts
// 第二段：關鍵的不變式或邊界處理
\`\`\`

## 替代方案

| 做法 | 取捨 | 何時適用 |
|---|---|---|
| A | | |
| B | | |

## 驗證

測試名稱、red→green 的案例、正式環境核對結果。

## 踩過的坑

## 限制

## 參考資料
`;
}
