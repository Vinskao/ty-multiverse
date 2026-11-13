// A nav bar search hit on a holding links to /stocks/?stock=CODE&tab=research: select that stock's row and tab once.
const TABS = ['price', 'institutional', 'margin', 'ownership', 'fundamentals', 'research', 'ai-analysis', 'targets'];

export function stockDeepLink(search: string): { code: string; tab: string | null } | null {
  const params = new URLSearchParams(search);
  const code = params.get('stock')?.trim();
  if (!code) return null;
  const tab = params.get('tab');
  return { code, tab: tab && TABS.includes(tab) ? tab : null };
}
