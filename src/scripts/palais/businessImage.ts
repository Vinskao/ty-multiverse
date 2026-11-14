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

/**
 * Set `index` of the variant, or the closest lower set the character has (so a character with only set 1 stays on it
 * while others reach set 2, 3...), or the original when it has no such set at all. Never throws.
 */
export async function resolveImageUrl({ base, name, timestamp, variant, business, index = 1, exists }: ResolveImageOptions): Promise<string> {
  const original = peopleImageUrl(base, name, timestamp, null);
  const picked = toVariant(variant ?? business);
  if (!picked) return original;
  for (let i = index; i >= 1; i -= 1) {
    const url = peopleImageUrl(base, name, timestamp, picked, i);
    try {
      if (await exists(url)) return url;
    } catch {
      return original;
    }
  }
  return original;
}
