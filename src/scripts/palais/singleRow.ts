// Single-row merge: any number of characters side by side in one row (never wrapped), spaced exactly
// like the basket preview on the group page. There every card sits in a 200px slot, the image is 300px
// tall, and each card has margin-left: -100px, so each character advances by 100px = one third of the
// height, and later characters are drawn over earlier ones.

const MAX_CANVAS_SIDE_PX = 16000; // stay well under browsers' maximum canvas dimension (32767 / 16384 on some)
const MAX_CANVAS_AREA_PX = 200_000_000; // and under the total-pixel limit (about 268M in Chromium)

/** How far each character advances, as a fraction of the row height (preview: 100px step / 300px height). */
export const SINGLE_ROW_STEP_RATIO = 100 / 300;

export interface SingleRowItem {
  /** left edge of the image */
  x: number;
  width: number;
}

export function layoutSingleRow(widths: readonly number[], height: number): { items: SingleRowItem[]; totalWidth: number } {
  if (widths.length < 1) return { items: [], totalWidth: 0 };
  const step = height * SINGLE_ROW_STEP_RATIO;
  const items = widths.map((width, index) => ({ x: index * step, width }));
  const last = items[items.length - 1];
  // a wide character at the end can reach past the last step
  const totalWidth = Math.max(...items.map((item) => item.x + item.width), last.x + last.width);
  return { items, totalWidth };
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
