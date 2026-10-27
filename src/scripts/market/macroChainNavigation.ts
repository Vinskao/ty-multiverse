/** The next visible stage boundary after a touch swipe, without sharing any state between chains. */
export function chainScrollTarget(offsets: readonly number[], scrollLeft: number, direction: 'previous' | 'next'): number {
    if (!offsets.length) return 0;
    return direction === 'next'
        ? offsets.find(offset => offset > scrollLeft + 2) ?? offsets[offsets.length - 1]
        : [...offsets].reverse().find(offset => offset < scrollLeft - 2) ?? offsets[0];
}
