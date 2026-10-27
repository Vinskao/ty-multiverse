import { micromark } from 'micromark';

// CommonMark's safe defaults escape raw HTML and reject dangerous URL protocols.
export function renderArticle(markdown: string): string {
  return micromark(markdown);
}
