export async function loadReceipts(token: string, request: typeof fetch = fetch, base = ''): Promise<string[]> {
  const response = await request(`${base.replace(/\/$/, '')}/api/market/notification-receipts`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('Notification receipts unavailable');
  const data = await response.json();
  return Array.isArray(data.ids) ? data.ids.filter((id: unknown): id is string => typeof id === 'string') : [];
}

export async function saveReceipts(token: string, ids: string[], request: typeof fetch = fetch, base = ''): Promise<void> {
  for (let offset = 0; offset < ids.length; offset += 200) {
    const response = await request(`${base.replace(/\/$/, '')}/api/market/notification-receipts`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ids.slice(offset, offset + 200) }),
    });
    if (!response.ok) throw new Error('Notification receipts unavailable');
  }
}
