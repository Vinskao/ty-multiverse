const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const STEP = 0.1;
const DEFAULT_SCALE = 1;

type ZoomContainer = HTMLElement & {
  dataset: DOMStringMap & {
    palaisZoomBound?: string;
    palaisMediaScale?: string;
  };
};

let keyboardZoomBound = false;

function clamp(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function formatScale(scale: number) {
  return scale.toFixed(2).replace(/\.?0+$/, '');
}

function getScale(container: ZoomContainer) {
  const current = Number.parseFloat(container.dataset.palaisMediaScale || '');
  return Number.isFinite(current) ? current : DEFAULT_SCALE;
}

function setScale(container: ZoomContainer, scale: number) {
  const nextScale = clamp(scale);
  const group = container.dataset.palaisMediaZoomGroup;
  const targets = group
    ? document.querySelectorAll<ZoomContainer>(
        `[data-palais-media-zoom-group="${CSS.escape(group)}"]`,
      )
    : [container];

  targets.forEach((target) => {
    target.dataset.palaisMediaScale = String(nextScale);
    target.style.setProperty('--palais-media-scale', String(nextScale));
    target.setAttribute('aria-label', `Media zoom ${formatScale(nextScale)}x`);
  });
}

function bindContainer(container: ZoomContainer) {
  if (container.dataset.palaisZoomBound === 'true') return;

  container.dataset.palaisZoomBound = 'true';
  setScale(container, getScale(container));

  container.addEventListener(
    'wheel',
    (event) => {
      if (container.dataset.palaisMediaZoomControls === 'keyboard') return;

      const target = event.target as Element | null;
      const mediaTarget = target?.closest('img, video');

      if (!mediaTarget || !container.contains(mediaTarget)) {
        return;
      }

      event.preventDefault();

      const direction = event.deltaY < 0 ? 1 : -1;
      const nextScale = getScale(container) + direction * STEP;
      setScale(container, nextScale);
    },
    { passive: false },
  );
}

function bindKeyboardZoom() {
  if (keyboardZoomBound) return;
  keyboardZoomBound = true;

  document.addEventListener('keydown', (event) => {
    if (!event.ctrlKey || event.metaKey || event.altKey) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

    const direction =
      event.key === '+' || event.key === '=' || event.code === 'NumpadAdd'
        ? 1
        : event.key === '-' || event.code === 'NumpadSubtract'
          ? -1
          : 0;
    if (!direction) return;

    const container = document.querySelector<ZoomContainer>(
      '[data-palais-media-zoom][data-palais-media-zoom-controls="keyboard"]',
    );
    if (!container) return;

    event.preventDefault();
    setScale(container, getScale(container) + direction * STEP);
  });
}

function initPalaisMediaZoom() {
  bindKeyboardZoom();
  document
    .querySelectorAll<ZoomContainer>('[data-palais-media-zoom]')
    .forEach(bindContainer);
}

initPalaisMediaZoom();
document.addEventListener('astro:page-load', initPalaisMediaZoom);
