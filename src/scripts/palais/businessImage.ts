// Alternate versions of a character image, stored next to ${name}.png:
//   商務 → ${name}Business.png      越野 → ${name}Hiking.png
// Not every character has them, so callers must fall back to the original image when one is missing.

export const BUSINESS_SUFFIX = 'Business';
export const HIKING_SUFFIX = 'Hiking';

export type ImageVariant = 'business' | 'hiking';

const SUFFIX: Record<ImageVariant, string> = { business: BUSINESS_SUFFIX, hiking: HIKING_SUFFIX };

/** `true` is kept as shorthand for the business version (the original API). */
export type VariantInput = ImageVariant | boolean | null | undefined;

function toVariant(input: VariantInput): ImageVariant | null {
  if (input === true) return 'business';
  return input || null;
}

/** Sets are numbered: index 1 is ${name}Business.png, index 2 is ${name}Business2.png, and so on. */
export const MAX_VARIANT_SETS = 9;

export function peopleImageUrl(base: string, name: string, timestamp: string, variant: VariantInput = null, index = 1): string {
  const picked = toVariant(variant);
  const file = picked ? `${name}${SUFFIX[picked]}${index > 1 ? index : ''}` : name;
  return `${base}/${encodeURIComponent(file)}.png?t=${timestamp}`;
}

export interface ResolveImageOptions {
  base: string;
  name: string;
  timestamp: string;
  /** which alternate version to look for; null/undefined = the original */
  variant?: VariantInput;
  /** which numbered set of the variant (1 = unnumbered file) */
  index?: number;
  /** @deprecated use `variant`; `true` means the business version */
  business?: boolean;
  /** resolves true if the image at this url can be loaded; may reject on a network failure */
  exists: (url: string) => Promise<boolean>;
}

/** The requested variant when present, otherwise the original image. Never throws. */
export async function resolveImageUrl({ base, name, timestamp, variant, business, index = 1, exists }: ResolveImageOptions): Promise<string> {
  const original = peopleImageUrl(base, name, timestamp, null);
  const picked = toVariant(variant ?? business);
  if (!picked) return original;
  const variantUrl = peopleImageUrl(base, name, timestamp, picked, index);
  try {
    return (await exists(variantUrl)) ? variantUrl : original;
  } catch {
    return original;
  }
}

/** The next/previous existing set, wrapping around. Sets are assumed contiguous (1, 2, 3...). */
export async function cycleVariantIndex(current: number, direction: 1 | -1, exists: (index: number) => Promise<boolean>): Promise<number> {
  const next = current + direction;
  if (direction === 1) return next <= MAX_VARIANT_SETS && (await exists(next)) ? next : 1;
  if (next >= 1) return next;
  let last = 1;
  while (last < MAX_VARIANT_SETS && (await exists(last + 1))) last += 1;
  return last;
}
