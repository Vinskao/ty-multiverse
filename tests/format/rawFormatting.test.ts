import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Ratchet: display numbers go through src/scripts/format/numbers.ts. Hand-written toFixed / toLocaleString /
// Intl.NumberFormat calls left in index.ts (quotes, portfolio, visit stats) may only be removed, never added.
// When you migrate some, lower BASELINE to the new count. Dates and SVG coordinates are not display numbers.
const BASELINE = 24;
const NUMBER_CALL = /\.toFixed\(|\.toLocaleString\(|new Intl\.NumberFormat\(/;
const NOT_A_DISPLAY_NUMBER = /new Date\(|Date\(|\bx\(|yOn\(|\by\(|hsl\(|cx:|cy:/;

describe('number formatting goes through format/numbers.ts', () => {
    it(`index.ts has at most ${BASELINE} hand-written number formatting calls`, () => {
        const source = readFileSync(resolve(__dirname, '../../src/scripts/index.ts'), 'utf-8');
        const calls = source.split('\n').filter((line) => NUMBER_CALL.test(line) && !NOT_A_DISPLAY_NUMBER.test(line));
        expect(calls.length, 'Use formatNumber / formatWithUnit / formatAxisTick from src/scripts/format/numbers.ts').toBeLessThanOrEqual(BASELINE);
    });
});
