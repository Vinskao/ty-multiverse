// Single-row merge: any number of characters side by side in one row (never wrapped). Neighbouring
// images overlap by 20% of the image width, and the overlap is shared: each image gives up 10% of
// its own width on every side that a neighbour covers, so the seams meet exactly with no gap and
// no double-covered strip.

const COVER_RATIO = 0.1; // 10% of an image's own width is covered per neighbouring side
const MAX_CANVAS_SIDE_PX = 16000; // stay well under browsers' maximum canvas dimension (32767 / 16384 on some)
const MAX_CANVAS_AREA_PX = 200_000_000; // and under the total-pixel limit (about 268M in Chromium)

export interface SingleRowItem {
  /** left edge of the full (uncropped) image */
  x: number;
  width: number;
  /** the part of the image that stays visible, in canvas coordinates */
  visibleLeft: number;
  visibleRight: number;
}

export function layoutSingleRow(widths: readonly number[]): { items: SingleRowItem[]; totalWidth: number } {
  if (widths.length < 1) return { items: [], totalWidth: 0 };

  const xs: number[] = [];
  let x = 0;
  widths.forEach((width, index) => {
    xs.push(x);
    const next = widths[index + 1];
    // the neighbours overlap by 10% of each one's own width (= 20% when the widths are equal)
    if (next !== undefined) x += width - COVER_RATIO * (width + next);
  });

  const last = widths.length - 1;
  const items = widths.map((width, index) => ({
    x: xs[index],
    width,
    visibleLeft: index === 0 ? xs[index] : xs[index] + COVER_RATIO * width,
    visibleRight: index === last ? xs[index] + width : xs[index] + width - COVER_RATIO * width,
  }));
  return { items, totalWidth: xs[last] + widths[last] };
}

/**
 * Export scale: 1 = the characters' original resolution. It only shrinks when the finished row would be
 * larger than a browser canvas allows (side length or total pixels), and never enlarges.
 */
export function singleRowExportScale(totalWidth: number, height: number): number {
  if (totalWidth <= 0 || height <= 0) return 1;
  return Math.min(
    1,
    MAX_CANVAS_SIDE_PX / totalWidth,
    MAX_CANVAS_SIDE_PX / height,
    Math.sqrt(MAX_CANVAS_AREA_PX / (totalWidth * height)),
  );
}
