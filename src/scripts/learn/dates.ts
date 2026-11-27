/** The attempts API may send epoch seconds; `new Date(1.77e9)` is January 1970. Seconds, milliseconds and ISO strings all work. */
export function learnDate(value: string | number): Date {
  const n = typeof value === 'number' ? value : /^\d+(\.\d+)?$/.test(value) ? Number(value) : NaN;
  return new Date(Number.isFinite(n) ? (n < 1e11 ? n * 1000 : n) : value);
}
