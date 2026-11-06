import { describe, expect, it } from 'vitest';
import { SINGLE_ROW_STEP_RATIO, layoutSingleRow, singleRowExportScale } from '../../src/scripts/palais/singleRow';

// The basket preview puts every card in a 200px slot, 300px tall, with margin-left: -100px.
// So each character advances 100px while being 300px tall: a fixed step of one third of the height.
describe('single-row merged layout (same spacing as the basket preview)', () => {
  it('advances each character by one third of the row height, like the preview', () => {
    expect(SINGLE_ROW_STEP_RATIO).toBeCloseTo(100 / 300, 12);
    const { items } = layoutSingleRow([162, 162, 162, 162], 300);
    expect(items.map((i) => i.x)).toEqual([0, 100, 200, 300]);
  });

  it('keeps the same step whatever the image widths are (the preview slot is a fixed width)', () => {
    const { items } = layoutSingleRow([100, 200, 150], 600);
    expect(items.map((i) => i.x)).toEqual([0, 200, 400]);
  });

  it('is as wide as the last character reaches', () => {
    const { totalWidth } = layoutSingleRow([162, 162, 162], 300);
    expect(totalWidth).toBe(200 + 162);
    // a wide last character sticks out past the step
    expect(layoutSingleRow([100, 400], 300).totalWidth).toBe(100 + 400);
  });

  it('has no upper limit on how many characters go into the row', () => {
    const { items, totalWidth } = layoutSingleRow(Array.from({ length: 12 }, () => 162), 300);
    expect(items).toHaveLength(12);
    expect(totalWidth).toBe(11 * 100 + 162);
  });

  it('returns an empty layout for an empty cart', () => {
    expect(layoutSingleRow([], 300)).toEqual({ items: [], totalWidth: 0 });
  });

  it('puts one character alone at the left edge', () => {
    expect(layoutSingleRow([120], 300)).toEqual({ items: [{ x: 0, width: 120 }], totalWidth: 120 });
  });
});

describe('single-row export scale', () => {
  it('exports at the original resolution (scale 1) when the canvas is within browser limits', () => {
    const { totalWidth } = layoutSingleRow([3478, 3478, 3478, 3478], 6423);
    expect(singleRowExportScale(totalWidth, 6423)).toBe(1);
  });

  it('never upscales a small row', () => {
    expect(singleRowExportScale(1000, 400)).toBe(1);
  });

  it('shrinks only as much as needed when the row is too wide for a canvas', () => {
    const scale = singleRowExportScale(40000, 6423);
    expect(scale).toBeLessThan(1);
    expect(40000 * scale).toBeLessThanOrEqual(16000);
  });

  it('also keeps the total pixel count under the canvas area limit', () => {
    const width = 15000;
    const height = 15000;
    const scale = singleRowExportScale(width, height);
    expect(width * scale * height * scale).toBeLessThanOrEqual(200_000_000);
  });
});
