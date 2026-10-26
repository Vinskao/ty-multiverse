import { describe, expect, it } from 'vitest';
import { addResearchDiagramZoom } from '../../src/scripts/market/researchDiagramZoom';

describe('research diagram zoom controls', () => {
    it('adds accessible zoom controls and lets the reader enlarge and reset a diagram', () => {
        const section = document.createElement('section');
        section.innerHTML = '<h5>Supply chain</h5><pre class="mermaid"><svg width="800" height="400" viewBox="0 0 800 400"></svg></pre>';

        addResearchDiagramZoom(section, 'en');

        const svg = section.querySelector('svg')!;
        const viewport = section.querySelector<HTMLElement>('.market-research-diagram-viewport')!;
        expect(viewport.getAttribute('aria-label')).toBe('Scrollable diagram');
        expect([...section.querySelectorAll('button')].map((button) => button.getAttribute('aria-label')))
            .toEqual(['Zoom out diagram', 'Reset diagram size', 'Zoom in diagram']);
        section.querySelector<HTMLButtonElement>('[aria-label="Zoom in diagram"]')!.click();
        expect(svg.style.width).toBe('1000px');
        section.querySelector<HTMLButtonElement>('[aria-label="Reset diagram size"]')!.click();
        expect(svg.style.width).toBe('800px');
        expect(viewport.dataset.zoom).toBe('1');
    });

    it('uses the viewBox width when Mermaid emits a responsive SVG width', () => {
        const section = document.createElement('section');
        section.innerHTML = '<h5>Roadmap</h5><pre class="mermaid"><svg width="100%" viewBox="0 0 1200 600"></svg></pre>';
        addResearchDiagramZoom(section, 'en');
        section.querySelector<HTMLButtonElement>('[aria-label="Zoom in diagram"]')!.click();
        expect(section.querySelector('svg')!.style.width).toBe('1500px');
    });
});
