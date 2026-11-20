// Draws the benchmark supply chain diagram using the same pinned Mermaid build as the About page.
import { lazyLoader } from '../lazy';
import { getMermaidConfig } from '../mermaid-theme';
import { addResearchDiagramZoom } from './researchDiagramZoom';

type MermaidLib = { initialize(config: unknown): void; run(options: { nodes: HTMLElement[] }): Promise<void> };

let script: Promise<MermaidLib> | null = null;
export function loadFromCdn(): Promise<MermaidLib> {
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
  for (const panel of doc.querySelectorAll<HTMLElement>('#benchmark-overview')) {
    if (panel.dataset.bound) continue;
    panel.dataset.bound = 'true';
    const draw = async () => {
      const nodes = [...panel.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed])')];
      if (!nodes.length) return;
      try {
        const mermaid = await load();
        mermaid.initialize({ ...getMermaidConfig(doc.documentElement.classList.contains('theme-dark')), startOnLoad: false });
        const currentNodes = nodes.filter(node => panel.contains(node));
        if (!currentNodes.length) return;
        await mermaid.run({ nodes: currentNodes });
        addResearchDiagramZoom(panel, 'zh');
        const code = searchTarget(doc);
        const hasEvidence = code && [...doc.querySelectorAll<HTMLOptionElement>('[data-benchmark-evidence] option')].some(o => o.value === code);
        if (!hasEvidence) highlightSearchTarget(panel, doc);
      } catch {
        for (const node of nodes) {
          const note = doc.createElement('p');
          note.textContent = '研究圖暫時無法載入，請稍後重新整理。';
          node.replaceWith(note);
        }
      } finally {
        panel.querySelector('[data-benchmark-loading]')?.remove();
      }
    };
    const loader = lazyLoader(panel, () => { void draw(); });
    panel.addEventListener('benchmark:diagram-update', () => { if (loader.isLoaded()) void draw(); });
    doc.addEventListener('astro:before-swap', () => loader.cancel(), { once: true });
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
