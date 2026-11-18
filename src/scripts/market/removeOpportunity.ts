export async function removeOpportunity(request: typeof fetch, url: string, headers: HeadersInit, code: string): Promise<void> {
  const read = await request(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!read.ok) throw new Error(`HTTP ${read.status}`);
  const payload = await read.json();
  if (!Array.isArray(payload.symbols)) throw new Error('Invalid selection');
  const symbols = payload.symbols.filter((item: { code: string }) => item.code.toUpperCase() !== code.toUpperCase());
  const writeHeaders = new Headers(headers);
  writeHeaders.set('Content-Type', 'application/json');
  const write = await request(url, { method: 'PUT', headers: writeHeaders, body: JSON.stringify({ symbols }), signal: AbortSignal.timeout(20000) });
  if (!write.ok) throw new Error(`HTTP ${write.status}`);
}

/** A stock the AI found (source "ai-watch") is not in the owner's PUT /custom selection; it is dismissed on its own endpoint. */
export async function removeWatched(request: typeof fetch, url: string, headers: HeadersInit, code: string): Promise<void> {
  const response = await request(`${url}/${encodeURIComponent(code.toUpperCase())}`, { method: 'DELETE', headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}
