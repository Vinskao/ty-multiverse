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
  container.dataset.palaisMediaScale = String(nextScale);
  container.style.setProperty('--palais-media-scale', String(nextScale));
  container.setAttribute('aria-label', `Media zoom ${formatScale(nextScale)}x`);
}

function bindContainer(container: ZoomContainer) {
  if (container.dataset.palaisZoomBound === 'true') return;

  container.dataset.palaisZoomBound = 'true';
  setScale(container, getScale(container));

  container.addEventListener(
    'wheel',
    (event) => {
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

function initPalaisMediaZoom() {
  document
    .querySelectorAll<ZoomContainer>('[data-palais-media-zoom]')
    .forEach(bindContainer);
}

initPalaisMediaZoom();
document.addEventListener('astro:page-load', initPalaisMediaZoom);
