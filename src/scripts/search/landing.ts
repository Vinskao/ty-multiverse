// Where a nav bar search hit lands on the destination page. Each hit kind carries its target in the URL:
//   /macro/?series=CODE        → switch to 指標總表 and outline the chart that draws CODE (else its group card)
//   /reports/?q=..&report=ID   → outline the report card containing that report after the library filters
//   /#benchmark-outlook        → open 年度 AI 長線格局
// The dashboard renders asynchronously, so each target is awaited with a MutationObserver that stops once found.

const MARK = 'is-search-landing';

function mark(element: Element) {
  element.classList.add(MARK);
  (element as HTMLElement).scrollIntoView?.({ block: 'center' });
  setTimeout(() => element.classList.remove(MARK), 6000);
}

/** Calls find() now and on every DOM change under root until it returns an element; returns a disconnect. */
function whenFound(root: Element | null, find: () => Element | null | undefined, then: (element: Element) => void): () => void {
  if (!root) return () => {};
  const first = find();
  if (first) { then(first); return () => {}; }
  const observer = new MutationObserver(() => {
    const element = find();
    if (element) { observer.disconnect(); then(element); }
  });
  observer.observe(root, { childList: true, subtree: true });
  const stop = setTimeout(() => observer.disconnect(), 30000);
  return () => { observer.disconnect(); clearTimeout(stop); };
}

export function macroLandingTarget(grid: ParentNode, code: string, group?: string | null): Element | null {
  const chart = [...grid.querySelectorAll<HTMLElement>('[data-macro-codes]')]
    .find(item => (item.dataset.macroCodes ?? '').split(' ').includes(code));
  return chart ?? (group ? grid.querySelector(`[data-macro-group="${CSS.escape(group)}"]`) : null);
}

export function landSearchHit(doc: Document = document, location: Pick<Location, 'search' | 'hash'> = doc.defaultView!.location): () => void {
  const params = new URLSearchParams(location.search);
  const undo: Array<() => void> = [];

  const series = params.get('series');
  if (series) {
    const grid = doc.getElementById('macro-indicator-grid');
    doc.querySelector<HTMLButtonElement>('[data-macro-view="grid"]')?.click();
    undo.push(whenFound(grid, () => grid && macroLandingTarget(grid, series, params.get('group')), mark));
  }

  const report = params.get('report');
  if (report) {
    const list = doc.getElementById('market-reports') ?? doc.body;
    undo.push(whenFound(list, () => [...doc.querySelectorAll<HTMLElement>('[data-report-ids]')]
      .find(card => !card.hidden && (card.dataset.reportIds ?? '').split(' ').includes(report)), mark));
  }

  if (location.hash === '#benchmark-outlook') {
    const outlook = doc.getElementById('benchmark-outlook') as HTMLDetailsElement | null;
    if (outlook) { outlook.open = true; mark(outlook); }
  }
  return () => { for (const off of undo) off(); };
}
