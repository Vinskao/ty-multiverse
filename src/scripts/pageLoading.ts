type ClassRoot = { classList: { add(c: string): void; remove(c: string): void } };

export const PAGE_LOADING_CLASS = 'page-loading';

// The server is slow: show a spinner as soon as a client-side navigation starts, hide it once the new page is in.
export function initPageLoading(target: EventTarget, root: ClassRoot): void {
  const show = () => root.classList.add(PAGE_LOADING_CLASS);
  const hide = () => root.classList.remove(PAGE_LOADING_CLASS);
  target.addEventListener('astro:before-preparation', show);
  target.addEventListener('astro:after-swap', hide);
  target.addEventListener('astro:page-load', hide);
}
