import { micromark } from 'micromark';

// CommonMark's safe defaults escape raw HTML and reject dangerous URL protocols,
// so every <hN> tag in the output is a real Markdown heading (code stays escaped).
export function renderArticle(markdown: string): string {
  const html = micromark(markdown);
  // The page header already holds the article title as the only <h1>; move body
  // headings down one level when the article itself starts at "#".
  if (!/<h1>/.test(html)) return html;
  return html.replace(/<(\/?)h([1-6])>/g, (_, slash: string, level: string) => `<${slash}h${Math.min(Number(level) + 1, 6)}>`);
}
