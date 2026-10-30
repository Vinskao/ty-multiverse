import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { diagramSource } from '../../src/scripts/portfolio/briefingSource';

const pre = (html: string, data: Record<string, string> = {}) => {
  const el = document.createElement('pre');
  el.className = 'mermaid';
  el.innerHTML = html;
  Object.assign(el.dataset, data);
  return el;
};

describe('where the architecture overview gets each diagram source from', () => {
  // 2026-10-30: arriving on About through the nav (Astro page transition) left the 架構圖總覽 empty. All 17 diagrams
  // carried the loader's data-mermaid-source but no data-original, and the overview only looked at data-original.
  it('prefers the saved original, then the loader\'s saved source', () => {
    expect(diagramSource(pre('<svg></svg>', { original: ' graph TD\nA-->B ', mermaidSource: 'graph TD\nX-->Y' }))).toBe('graph TD\nA-->B');
    expect(diagramSource(pre('<svg></svg>', { mermaidSource: ' graph TD\nX-->Y ' }))).toBe('graph TD\nX-->Y');
  });

  it('reads the raw text when the diagram has not been rendered yet', () => {
    expect(diagramSource(pre('graph TD\nA-->B'))).toBe('graph TD\nA-->B');
  });

  it('never returns rendered SVG or Mermaid\'s injected CSS as if it were source', () => {
    expect(diagramSource(pre('<svg><g></g></svg>'))).toBe('');
    expect(diagramSource(pre('#mermaid-1{font-family:x}'))).toBe('');
    expect(diagramSource(pre(''))).toBe('');
  });
});

describe('the overview block uses it', () => {
  it('asks the shared helper instead of reading data-original alone', () => {
    const preview = readFileSync('src/components/ResumePreview.astro', 'utf8');
    const fill = preview.slice(preview.indexOf('function fillInlineBriefing()'));
    expect(fill).toContain('__diagramSource');
    expect(fill).not.toMatch(/var src = origPre && origPre\.dataset && origPre\.dataset\.original;/);
    expect(preview).toMatch(/__diagramSource\s*=\s*diagramSource/);
  });
});
