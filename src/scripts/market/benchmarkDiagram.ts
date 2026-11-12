// Draws the benchmark supply chain diagram when its <details> panel is opened. Mermaid is loaded only then,
// from the same pinned CDN build the About page uses, so the homepage does not pay for it up front.
import { getMermaidConfig } from '../mermaid-theme';
import { addResearchDiagramZoom } from './researchDiagramZoom';

type MermaidLib = { initialize(config: unknown): void; run(options: { nodes: HTMLElement[] }): Promise<void> };

let script: Promise<MermaidLib> | null = null;
function loadFromCdn(): Promise<MermaidLib> {
  script ??= new Promise<MermaidLib>((done, fail) => {
    const ready = (window as unknown as { mermaid?: MermaidLib }).mermaid;
    if (ready) return done(ready);
    const tag = document.createElement('script');
    tag.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
    tag.onload = () => done((window as unknown as { mermaid: MermaidLib }).mermaid);
    tag.onerror = () => { script = null; fail(new Error('Mermaid unavailable')); };
    document.head.appendChild(tag);
  });
  return script;
}

export function initBenchmarkDiagram(doc: Document = document, load: () => Promise<MermaidLib> = loadFromCdn): void {
  for (const panel of doc.querySelectorAll<HTMLDetailsElement>('#benchmark details.overview')) {
    if (panel.dataset.bound) continue;
    panel.dataset.bound = 'true';
    const draw = async () => {
      const nodes = [...panel.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed])')];
      if (!panel.open || !nodes.length) return;
      try {
        const mermaid = await load();
        mermaid.initialize({ ...getMermaidConfig(doc.documentElement.classList.contains('theme-dark')), startOnLoad: false });
        await mermaid.run({ nodes });
        addResearchDiagramZoom(panel, 'zh');
        highlightSearchTarget(panel, doc);
      } catch {
        for (const node of nodes) {
          const note = doc.createElement('p');
          note.textContent = '研究圖暫時無法載入，請稍後重新整理。';
          node.replaceWith(note);
        }
      }
    };
    panel.addEventListener('toggle', () => { void draw(); });
    // A nav bar search hit links here as /?benchmark=CODE#benchmark: open the diagram straight away.
    if (searchTarget(doc)) panel.open = true;
    void draw();
  }
}

export function searchTarget(doc: Document = document, search = doc.defaultView?.location.search ?? ''): string | null {
  return new URLSearchParams(search).get('benchmark');
}

/** Outlines the searched company's node (Mermaid ids look like "flowchart-c2330-12") and scrolls it into view. */
export function highlightSearchTarget(panel: HTMLElement, doc: Document = document,
  search = doc.defaultView?.location.search ?? ''): HTMLElement | null {
  const code = searchTarget(doc, search);
  if (!code) return null;
  const nodeId = `c${code.replace(/[^A-Za-z0-9]/g, '_')}`;
  const node = [...panel.querySelectorAll<HTMLElement>('g.node, g[id]')]
    .find(item => new RegExp(`(^|-)${nodeId}(-|$)`).test(item.id)) ?? null;
  if (node) {
    node.classList.add('is-search-target');
    node.scrollIntoView?.({ block: 'center', inline: 'center' });
  }
  return node;
}
