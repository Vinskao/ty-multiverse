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
      } catch {
        for (const node of nodes) {
          const note = doc.createElement('p');
          note.textContent = '研究圖暫時無法載入，請稍後重新整理。';
          node.replaceWith(note);
        }
      }
    };
    panel.addEventListener('toggle', () => { void draw(); });
    void draw();
  }
}
