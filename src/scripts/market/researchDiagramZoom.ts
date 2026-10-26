const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

/** Add accessible zoom controls to a rendered Mermaid research diagram. */
export function addResearchDiagramZoom(section: HTMLElement, lang: 'en' | 'zh'): void {
    const svg = section.querySelector<SVGSVGElement>('pre.mermaid svg');
    if (!svg || section.querySelector('.market-research-diagram-controls')) return;

    const t = lang === 'zh'
        ? { zoomOut: '縮小圖表', zoomIn: '放大圖表', reset: '重設大小', viewport: '可捲動圖表' }
        : { zoomOut: 'Zoom out diagram', zoomIn: 'Zoom in diagram', reset: 'Reset diagram size', viewport: 'Scrollable diagram' };
    const controls = document.createElement('div');
    controls.className = 'market-research-diagram-controls';
    const viewport = document.createElement('div');
    viewport.className = 'market-research-diagram-viewport';
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', t.viewport);
    const widthAttribute = svg.getAttribute('width') ?? '';
    const fixedWidth = /^\s*(\d+(?:\.\d+)?)(?:px)?\s*$/.exec(widthAttribute);
    const baseWidth = (fixedWidth ? Number(fixedWidth[1]) : 0) || svg.viewBox.baseVal.width;
    if (!Number.isFinite(baseWidth) || baseWidth <= 0) return;

    let zoom = MIN_ZOOM;
    const applyZoom = () => {
        svg.style.width = `${baseWidth * zoom}px`;
        svg.style.maxWidth = 'none';
        viewport.dataset.zoom = String(zoom);
    };
    const button = (label: string, text: string, change: () => void) => {
        const control = document.createElement('button');
        control.type = 'button';
        control.setAttribute('aria-label', label);
        control.textContent = text;
        control.addEventListener('click', change);
        controls.append(control);
        return control;
    };
    button(t.zoomOut, '−', () => { zoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP); applyZoom(); });
    button(t.reset, lang === 'zh' ? '重設' : 'Reset', () => { zoom = MIN_ZOOM; applyZoom(); viewport.scrollLeft = 0; viewport.scrollTop = 0; });
    button(t.zoomIn, '+', () => { zoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP); applyZoom(); });
    section.insertBefore(controls, section.firstChild?.nextSibling ?? null);
    viewport.append(section.querySelector('pre.mermaid')!);
    section.append(viewport);
    applyZoom();
}
