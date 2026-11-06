// Business ("商務") version of a character image: ${name}Business.png next to ${name}.png.
// Not every character has one, so callers must fall back to the original image when it is missing.

export const BUSINESS_SUFFIX = 'Business';

export function peopleImageUrl(base: string, name: string, timestamp: string, business = false): string {
  const file = business ? `${name}${BUSINESS_SUFFIX}` : name;
  return `${base}/${encodeURIComponent(file)}.png?t=${timestamp}`;
}

export interface ResolveImageOptions {
  base: string;
  name: string;
  timestamp: string;
  business: boolean;
  /** resolves true if the image at this url can be loaded; may reject on a network failure */
  exists: (url: string) => Promise<boolean>;
}

/** The business image when asked for and present, otherwise the original image. Never throws. */
export async function resolveImageUrl({ base, name, timestamp, business, exists }: ResolveImageOptions): Promise<string> {
  const original = peopleImageUrl(base, name, timestamp, false);
  if (!business) return original;
  const businessUrl = peopleImageUrl(base, name, timestamp, true);
  try {
    return (await exists(businessUrl)) ? businessUrl : original;
  } catch {
    return original;
  }
}
