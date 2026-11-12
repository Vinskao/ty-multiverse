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

    it('zooms with ctrl + wheel around the cursor and leaves a plain wheel to scroll the page', () => {
        const section = document.createElement('section');
        section.innerHTML = '<h5>Benchmark</h5><pre class="mermaid"><svg width="800" viewBox="0 0 800 400"></svg></pre>';
        addResearchDiagramZoom(section, 'zh');
        const viewport = section.querySelector<HTMLElement>('.market-research-diagram-viewport')!;
        const plain = new WheelEvent('wheel', { deltaY: -100, cancelable: true });
        viewport.dispatchEvent(plain);
        expect(plain.defaultPrevented).toBe(false);
        expect(viewport.dataset.zoom).toBe('1');
        const zoomIn = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, cancelable: true, clientX: 0, clientY: 0 });
        viewport.dispatchEvent(zoomIn);
        expect(zoomIn.defaultPrevented).toBe(true);
        expect(Number(viewport.dataset.zoom)).toBeGreaterThan(1);
        viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, cancelable: true }));
        viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, cancelable: true }));
        expect(Number(viewport.dataset.zoom)).toBeLessThan(1);
    });

    it('pans the diagram by dragging with the mouse', () => {
        const section = document.createElement('section');
        section.innerHTML = '<h5>Benchmark</h5><pre class="mermaid"><svg width="800" viewBox="0 0 800 400"></svg></pre>';
        addResearchDiagramZoom(section, 'zh');
        const viewport = section.querySelector<HTMLElement>('.market-research-diagram-viewport')!;
        viewport.scrollLeft = 300; viewport.scrollTop = 200;
        viewport.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 100, clientY: 100, bubbles: true }));
        viewport.dispatchEvent(new MouseEvent('pointermove', { clientX: 60, clientY: 70, bubbles: true }));
        expect(viewport.scrollLeft).toBe(340);
        expect(viewport.scrollTop).toBe(230);
        expect(viewport.classList.contains('is-dragging')).toBe(true);
        viewport.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
        expect(viewport.classList.contains('is-dragging')).toBe(false);
    });
});
