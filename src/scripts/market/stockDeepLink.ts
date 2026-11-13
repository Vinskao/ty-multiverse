// A nav bar search hit links to /stocks/?stock=CODE&name=NAME&tab=research: select that stock and tab once.
// Codes outside the holdings list (benchmark companies such as 2330) open from code and name alone, as Taiwan stocks.
const TABS = ['price', 'institutional', 'margin', 'ownership', 'fundamentals', 'research', 'ai-analysis', 'targets'];

export function stockDeepLink(search: string): { code: string; name: string; tab: string | null } | null {
  const params = new URLSearchParams(search);
  const code = params.get('stock')?.trim();
  if (!code) return null;
  const tab = params.get('tab');
  return { code, name: params.get('name')?.trim() || code, tab: tab && TABS.includes(tab) ? tab : null };
}
