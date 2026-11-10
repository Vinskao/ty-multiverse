// Full-text search for the report library: the browser only holds titles and claims, so words that appear
// only in a report's body are looked up on the server (maya-sawa GET /market/reports/fulltext).

export type FulltextHit = { page: number; snippet: string };
type Row = { report_id: string; page: number; snippet: string };

/**
 * Debounced lookup. `query` is called on every keystroke; the server is asked once typing pauses,
 * answers to older queries are dropped, and a failure leaves the local title/claim search untouched.
 */
export function createFulltextSearch(
  fetcher: (url: string) => Promise<Response>,
  onChange: () => void,
  delayMs = 250,
  endpoint = '/api/market/reports/fulltext',
) {
  let hits = new Map<string, FulltextHit>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;
  return {
    matches: () => hits,
    query(text: string) {
      const q = text.trim();
      clearTimeout(timer);
      const ticket = ++latest;
      if (!q) { hits = new Map(); return; }
      timer = setTimeout(() => {
        fetcher(`${endpoint}?q=${encodeURIComponent(q)}`)
          .then((response) => response.ok ? response.json() : { results: [] })
          .then((payload: { results?: Row[] }) => {
            if (ticket !== latest) return;
            hits = new Map((payload.results ?? []).map((row) => [row.report_id, { page: row.page, snippet: row.snippet }]));
            onChange();
          })
          .catch(() => { if (ticket === latest) { hits = new Map(); onChange(); } });
      }, delayMs);
    },
  };
}
