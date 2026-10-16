import { describe, it, expect } from 'vitest';
import { formatNumber, formatAxisTick, numberKindFor, formatWithUnit, publishedDigits } from '../../src/scripts/format/numbers';

describe('numberKindFor', () => {
    it('treats people, jobs, claims, shares, lots and holders as whole counts', () => {
        expect(numberKindFor('persons')).toBe('count');
        expect(numberKindFor('thousand persons', 'jobs')).toBe('count');
        expect(numberKindFor('persons', 'claims')).toBe('count');
        expect(numberKindFor('shares')).toBe('count');
        expect(numberKindFor('lots')).toBe('count');
        expect(numberKindFor('NTD thousand')).toBe('count');
    });

    it('treats growth formats and percent units as percent', () => {
        expect(numberKindFor('index 1982-84=100', 'mom')).toBe('percent');
        expect(numberKindFor('NTD thousand', 'yoy')).toBe('percent');
        expect(numberKindFor('percent')).toBe('percent');
    });

    it('treats prices, exchange rates and index levels as two-decimal values', () => {
        expect(numberKindFor('USD/troy oz')).toBe('decimal');
        expect(numberKindFor('TWD/USD')).toBe('decimal');
        expect(numberKindFor('index points')).toBe('decimal');
        expect(numberKindFor('millions of dollars')).toBe('millions');
    });
});

describe('formatNumber', () => {
    it('never shows decimals on counts', () => {
        expect(formatNumber(199000, 'count')).toBe('199,000');
        expect(formatNumber(29000.4, 'count')).toBe('29,000');
        expect(formatNumber(-10000, 'count', { signed: true })).toBe('-10,000');
    });

    it('shows two decimals on percent, pp and decimal values', () => {
        expect(formatNumber(3.7428, 'percent')).toBe('3.74%');
        expect(formatNumber(0.13, 'pp', { signed: true })).toBe('+0.13 pp');
        expect(formatNumber(4208.3, 'decimal')).toBe('4,208.30');
        expect(formatNumber(157.976, 'decimal')).toBe('157.98');
    });

    it('rounds millions to whole numbers and allows an explicit digit override', () => {
        expect(formatNumber(745021.4, 'millions')).toBe('745,021');
        expect(formatNumber(32.265, 'decimal', { digits: 3 })).toBe('32.265');
    });

    it('signs positives only when asked and keeps a rounded zero unsigned', () => {
        expect(formatNumber(0.65, 'percent', { signed: true })).toBe('+0.65%');
        expect(formatNumber(0.001, 'percent', { signed: true })).toBe('0.00%');
        expect(formatNumber(0.65, 'percent')).toBe('0.65%');
    });

    it('returns a dash for missing or non-numeric values', () => {
        expect(formatNumber(null, 'count')).toBe('—');
        expect(formatNumber('.', 'decimal')).toBe('—');
        expect(formatNumber(Number.NaN, 'percent')).toBe('—');
    });

    it('accepts numeric strings from the API', () => {
        expect(formatNumber('159044', 'count')).toBe('159,044');
    });
});

describe('formatWithUnit', () => {
    it('appends the unit except where the kind already carries it', () => {
        expect(formatWithUnit(199000, 'persons', 'claims', '人')).toBe('199,000 人');
        expect(formatWithUnit(4208.3, 'USD/troy oz')).toBe('4,208.30 USD/troy oz');
        expect(formatWithUnit(3.74, 'percent')).toBe('3.74%');
        expect(formatWithUnit(0.65, 'index 1982-84=100', 'mom')).toBe('0.65%');
    });
});

describe('formatAxisTick', () => {
    it('uses fewer decimals on axes than in readouts', () => {
        expect(formatAxisTick(3.75, 'percent')).toBe('3.8%');
        expect(formatAxisTick(199123, 'count')).toBe('199,123');
        expect(formatAxisTick(4252.4, 'decimal')).toBe('4,252.4');
    });
});

describe('publishedDigits', () => {
    it('keeps a published rate at its source precision (CBC moves in 1/8 points), between two and three decimals', () => {
        expect(publishedDigits('2.375')).toBe(3);
        expect(publishedDigits('1.875')).toBe(3);
        expect(publishedDigits('4')).toBe(2);
        expect(publishedDigits('5.19')).toBe(2);
        expect(publishedDigits('3.74281')).toBe(3);
        expect(publishedDigits(undefined)).toBe(2);
        expect(formatNumber('2.375', 'percent', { digits: publishedDigits('2.375') })).toBe('2.375%');
        expect(formatNumber(0.125, 'pp', { signed: true, digits: publishedDigits('2.375', '2.25') })).toBe('+0.125 pp');
    });
});
