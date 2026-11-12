const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const WHEEL_FACTOR = 1.2;

const clamp = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 1000) / 1000));

/** Zoom and pan for a rendered Mermaid research diagram: +/− buttons, ctrl + wheel around the cursor, drag to pan.
 *  A plain wheel still scrolls the page, so the diagram never traps the reader. It opens fitted to the viewport width. */
export function addResearchDiagramZoom(section: HTMLElement, lang: 'en' | 'zh'): void {
    const svg = section.querySelector<SVGSVGElement>('pre.mermaid svg');
    if (!svg || section.querySelector('.market-research-diagram-controls')) return;

    const t = lang === 'zh'
        ? { zoomOut: '縮小圖表', zoomIn: '放大圖表', reset: '重設大小', viewport: '可捲動圖表', hint: 'Ctrl＋滾輪縮放，按住拖曳移動' }
        : { zoomOut: 'Zoom out diagram', zoomIn: 'Zoom in diagram', reset: 'Reset diagram size', viewport: 'Scrollable diagram', hint: 'Ctrl + wheel to zoom, drag to move' };
    const controls = document.createElement('div');
    controls.className = 'market-research-diagram-controls';
    const viewport = document.createElement('div');
    viewport.className = 'market-research-diagram-viewport';
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', t.viewport);
    viewport.title = t.hint;
    const widthAttribute = svg.getAttribute('width') ?? '';
    const fixedWidth = /^\s*(\d+(?:\.\d+)?)(?:px)?\s*$/.exec(widthAttribute);
    const baseWidth = (fixedWidth ? Number(fixedWidth[1]) : 0) || svg.viewBox.baseVal.width;
    if (!Number.isFinite(baseWidth) || baseWidth <= 0) return;

    let zoom = 1;
    const fitZoom = () => (viewport.clientWidth > 0 ? clamp(Math.min(1, (viewport.clientWidth - 2) / baseWidth)) : 1);
    const applyZoom = () => {
        svg.style.width = `${baseWidth * zoom}px`;
        svg.style.minWidth = '0';
        svg.style.maxWidth = 'none';
        svg.style.height = 'auto';
        viewport.dataset.zoom = String(zoom);
    };
    // Keep the diagram point under (x, y) — viewport coordinates — in place while the scale changes.
    const zoomTo = (next: number, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) => {
        next = clamp(next);
        if (next === zoom) return;
        const ratio = next / zoom;
        const left = (viewport.scrollLeft + x) * ratio - x;
        const top = (viewport.scrollTop + y) * ratio - y;
        zoom = next;
        applyZoom();
        viewport.scrollLeft = Math.max(0, left);
        viewport.scrollTop = Math.max(0, top);
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
    button(t.zoomOut, '−', () => zoomTo(zoom - ZOOM_STEP));
    button(t.reset, lang === 'zh' ? '重設' : 'Reset', () => { zoom = fitZoom(); applyZoom(); viewport.scrollLeft = 0; viewport.scrollTop = 0; });
    button(t.zoomIn, '+', () => zoomTo(zoom + ZOOM_STEP));
    const hint = document.createElement('span');
    hint.className = 'market-research-diagram-hint';
    hint.textContent = t.hint;
    controls.prepend(hint);

    viewport.addEventListener('wheel', (event) => {
        if (!event.ctrlKey && !event.metaKey) return; // plain wheel scrolls the page
        event.preventDefault();
        const box = viewport.getBoundingClientRect();
        zoomTo(event.deltaY < 0 ? zoom * WHEEL_FACTOR : zoom / WHEEL_FACTOR, event.clientX - box.left, event.clientY - box.top);
    }, { passive: false });

    let drag: { x: number; y: number; left: number; top: number } | null = null;
    viewport.addEventListener('pointerdown', (event) => {
        if ((event as PointerEvent).button !== 0 || (event as PointerEvent).pointerType === 'touch') return; // touch scrolls natively
        drag = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
        viewport.classList.add('is-dragging');
        try { viewport.setPointerCapture((event as PointerEvent).pointerId); } catch { /* synthetic events have no pointer */ }
    });
    viewport.addEventListener('pointermove', (event) => {
        if (!drag) return;
        viewport.scrollLeft = drag.left - (event.clientX - drag.x);
        viewport.scrollTop = drag.top - (event.clientY - drag.y);
    });
    const stop = () => { drag = null; viewport.classList.remove('is-dragging'); };
    viewport.addEventListener('pointerup', stop);
    viewport.addEventListener('pointercancel', stop);
    viewport.addEventListener('dragstart', (event) => event.preventDefault());

    section.insertBefore(controls, section.firstChild?.nextSibling ?? null);
    viewport.append(section.querySelector('pre.mermaid')!);
    section.append(viewport);
    zoom = fitZoom();
    applyZoom();
}
