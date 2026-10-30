/**
 * The Mermaid source for one diagram, whatever state the page is in. Page transitions can leave a diagram already
 * rendered with only the loader's data-mermaid-source on it, so the overview must not rely on data-original alone.
 */
export function diagramSource(pre: HTMLElement): string {
  const saved = pre.dataset.original || pre.dataset.mermaidSource;
  if (saved) return saved.trim();
  if (pre.querySelector('svg')) return '';
  const text = (pre.textContent ?? '').trim();
  return text.startsWith('<') || text.startsWith('#mermaid') ? '' : text;
}
