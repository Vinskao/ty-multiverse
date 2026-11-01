import { beforeEach, describe, expect, it } from 'vitest';
import { prepareDiagrams } from '../../src/scripts/mermaidPlan';

const all = () => Array.from(document.querySelectorAll<HTMLElement>('.mermaid'));

describe('which Mermaid diagrams get drawn', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="mermaid" id="open">graph A</div>
      <details><summary>closed</summary><div class="mermaid" id="closed">graph B</div></details>
      <details open><summary>open</summary><div class="mermaid" id="inside-open">graph C</div></details>
      <div class="mermaid" id="done" data-processed="true"><svg></svg></div>`;
  });

  it('draws only visible diagrams that have not been drawn yet', () => {
    expect(prepareDiagrams(all(), false).map((d) => d.id)).toEqual(['open', 'inside-open']);
  });

  it('keeps hidden diagrams as source text so they can be drawn when opened', () => {
    prepareDiagrams(all(), false);
    const closed = document.getElementById('closed')!;
    expect(closed.textContent).toBe('graph B');
    expect(closed.dataset.mermaidSource).toBe('graph B');
    document.querySelector('details')!.open = true;
    expect(prepareDiagrams(all(), false).map((d) => d.id)).toContain('closed');
  });

  it('leaves already drawn diagrams alone unless forced (a theme change)', () => {
    const done = document.getElementById('done')!;
    done.dataset.mermaidSource = 'graph D';
    expect(prepareDiagrams(all(), false).map((d) => d.id)).not.toContain('done');
    expect(done.querySelector('svg')).not.toBeNull();
    expect(prepareDiagrams(all(), true).map((d) => d.id)).toContain('done');
    expect(done.textContent).toBe('graph D');
    expect(done.hasAttribute('data-processed')).toBe(false);
  });
});
