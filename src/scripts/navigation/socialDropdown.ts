/**
 * Controller for the navbar social links popover.
 * Collapses the 6 social links into a single trigger icon button,
 * toggling a small popup window on click.
 */
export function initSocialDropdown(root: ParentNode = document): (() => void) | undefined {
  const container = root.querySelector('.social-dropdown');
  if (!container) return;

  const button = container.querySelector<HTMLButtonElement>('.social-toggle-btn');
  const popover = container.querySelector<HTMLElement>('.social-popover');
  if (!button || !popover) return;

  const toggle = (show?: boolean) => {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    const nextState = show !== undefined ? show : !isExpanded;
    button.setAttribute('aria-expanded', String(nextState));
    popover.hidden = !nextState;
  };

  const onBtnClick = (e: MouseEvent) => {
    e.stopPropagation();
    toggle();
  };

  const onDocClick = (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) {
      toggle(false);
    }
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      toggle(false);
      button.focus();
    }
  };

  button.addEventListener('click', onBtnClick);
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKeydown);

  return () => {
    button.removeEventListener('click', onBtnClick);
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKeydown);
  };
}
