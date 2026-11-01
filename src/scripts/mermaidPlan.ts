// Which Mermaid diagrams need drawing now. About holds ~34 diagrams, almost all inside collapsed <details>; drawing all of
// them on every language switch blocked the main thread for ~4.5 s. Only visible, not-yet-drawn diagrams are drawn; the rest
// keep their source text and are drawn when their <details> opens.

export function isHiddenInClosedDetails(diagram: Element): boolean {
  return diagram.closest('details:not([open])') !== null;
}

/**
 * Resets the diagrams that must be redrawn (all of them when `force`, e.g. a theme change; otherwise only ones never drawn)
 * back to their source text and returns the subset that is visible and should be handed to Mermaid now.
 */
export function prepareDiagrams(diagrams: HTMLElement[], force: boolean): HTMLElement[] {
  const toDraw: HTMLElement[] = [];
  for (const diagram of diagrams) {
    const drawn = diagram.hasAttribute('data-processed');
    if (!force && drawn) continue;
    const source = diagram.dataset.mermaidSource ?? diagram.textContent ?? '';
    diagram.dataset.mermaidSource = source;
    diagram.removeAttribute('data-processed');
    diagram.textContent = source;
    if (!isHiddenInClosedDetails(diagram)) toDraw.push(diagram);
  }
  return toDraw;
}
