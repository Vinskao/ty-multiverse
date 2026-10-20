import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('leaves initial and theme redraws to the serialized render queue', () => {
  const loader = readFileSync(resolve(__dirname, '../../src/components/MermaidLoader.astro'), 'utf8');
  // Automatic DOMContentLoaded rendering bypasses the queue and can parse an
  // SVG while an explicit run is replacing the same Mermaid element.
  const initializations = [...loader.matchAll(/mermaidLib\.initialize\(([^;]+)\);/g)];
  expect(initializations).toHaveLength(2);
  for (const [, config] of initializations) {
    expect(config).toContain('startOnLoad: false');
  }
});

 it('routes inline briefing diagrams through the same render queue', () => {
  const preview = readFileSync(resolve(__dirname, '../../src/components/ResumePreview.astro'), 'utf8');
  const briefing = preview.slice(preview.indexOf('function fillInlineBriefing()'));
  expect(briefing).not.toContain('window.mermaid.run(');
  expect(briefing).toContain("new Event('tym:mermaid-refresh')");
  const loader = readFileSync(resolve(__dirname, '../../src/components/MermaidLoader.astro'), 'utf8');
  expect(loader).toContain("document.addEventListener('tym:mermaid-refresh', loadMermaid)");
});
