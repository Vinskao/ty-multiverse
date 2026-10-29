const KEY = 'learn_guest_id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface StringStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function ensureLearnGuestId(
  storage: StringStorage,
  createId: () => string = () => crypto.randomUUID(),
): string {
  const existing = storage.getItem(KEY);
  if (existing && UUID_PATTERN.test(existing)) return existing.toLowerCase();
  const generated = createId().toLowerCase();
  if (!UUID_PATTERN.test(generated)) throw new Error('Learn guest ID generator returned an invalid UUID');
  storage.setItem(KEY, generated);
  return generated;
}

export function publicLearnHeaders(guestId: string): Record<string, string> {
  if (!UUID_PATTERN.test(guestId)) throw new Error('Invalid learn guest ID');
  return { 'X-Learn-Guest-Id': guestId.toLowerCase() };
}
