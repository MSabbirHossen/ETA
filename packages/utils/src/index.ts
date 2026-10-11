/**
 * Generates a slug from a string.
 * Used for programs, courses, blog posts etc. per PRD slug requirements.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Calculates pagination metadata — PRD §67
 */
export function calculatePaginationMeta(
  total: number,
  page: number,
  limit: number,
): { page: number; limit: number; total: number; pages: number } {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Narrows a value to ensure it's not null or undefined.
 */
export function assertDefined<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${name} to be defined`);
  }
  return value;
}

/**
 * Ensures a string is a valid 24-character hexadecimal MongoDB ObjectId string.
 * If already valid, returns it as-is.
 * Otherwise, generates a deterministic 24-char hex string derived from input.
 */
export function toValidObjectId(input: string): string {
  if (!input) return '000000000000000000000000';
  if (/^[0-9a-fA-F]{24}$/.test(input)) {
    return input;
  }
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  return (part1 + part2 + part3).slice(0, 24);
}
