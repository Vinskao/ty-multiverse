import { describe, expect, it } from 'vitest';
import { layoutSingleRow, singleRowExportScale } from '../../src/scripts/palais/singleRow';

describe('single-row merged layout', () => {
  it('has no upper limit on how many characters go into the row', () => {
    const widths = Array.from({ length: 12 }, () => 100);
    const { items, totalWidth } = layoutSingleRow(widths);
    expect(items).toHaveLength(12);
    expect(totalWidth).toBe(100 + 11 * 80);
  });

  it('returns an empty layout for an empty cart', () => {
    expect(layoutSingleRow([])).toEqual({ items: [], totalWidth: 0 });
  });

  it('puts one character alone with nothing covered', () => {
    const { items, totalWidth } = layoutSingleRow([120]);
    expect(totalWidth).toBe(120);
    expect(items).toEqual([{ x: 0, width: 120, visibleLeft: 0, visibleRight: 120 }]);
  });

  it('overlaps each adjacent pair by 20% of the image width', () => {
    const { items, totalWidth } = layoutSingleRow([100, 100, 100, 100]);
    expect(items.map((i) => i.x)).toEqual([0, 80, 160, 240]);
    expect(totalWidth).toBe(340); // 100 + 3 * 80
  });

  it('cuts 10% off the covered side of each image, so the seams meet exactly', () => {
    const { items } = layoutSingleRow([100, 100, 100]);
    expect(items[0]).toMatchObject({ visibleLeft: 0, visibleRight: 90 });
    expect(items[1]).toMatchObject({ x: 80, visibleLeft: 90, visibleRight: 170 });
    expect(items[2]).toMatchObject({ x: 160, visibleLeft: 170, visibleRight: 260 });
    expect(items[0].visibleRight).toBe(items[1].visibleLeft);
    expect(items[1].visibleRight).toBe(items[2].visibleLeft);
  });

  it('keeps the seams meeting when the images have different widths', () => {
    const { items, totalWidth } = layoutSingleRow([100, 200, 150]);
    for (let i = 0; i < items.length - 1; i += 1) {
      expect(items[i].visibleRight).toBeCloseTo(items[i + 1].visibleLeft, 9);
    }
    expect(items[1].visibleLeft - items[1].x).toBeCloseTo(20, 9);
    expect(items[1].x + items[1].width - items[1].visibleRight).toBeCloseTo(20, 9);
    expect(items[2].visibleLeft - items[2].x).toBeCloseTo(15, 9);
    expect(totalWidth).toBeCloseTo(items[2].x + items[2].width, 9);
  });
});

describe('single-row export scale', () => {
  it('exports at the original resolution (scale 1) when the canvas is within browser limits', () => {
    // four 3478x6423 originals: about 11.8k wide, well under the limits
    const { totalWidth } = layoutSingleRow([3478, 3478, 3478, 3478]);
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
