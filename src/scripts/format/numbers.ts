// Single place that decides how a number is shown; covered by tests/format/numbers.test.ts.
// Callers pass the kind of quantity (or let numberKindFor derive it from the series unit) instead of choosing
// decimals themselves, so counts never show decimals and percentages always show two.

// price: market quotes, up to two decimals without trailing zeros (2,420 / 447.5 / 738.46).
export type NumberKind = 'count' | 'percent' | 'pp' | 'decimal' | 'millions' | 'price';

const DIGITS: Record<NumberKind, number> = { count: 0, percent: 2, pp: 2, decimal: 2, millions: 0, price: 2 };
const AXIS_DIGITS: Record<NumberKind, number> = { count: 0, percent: 1, pp: 1, decimal: 1, millions: 0, price: 1 };
const COUNT_UNIT = /persons|jobs|shares|lots|contracts|holders|NTD thousand|people|人|股|張|口/i;

// Kind from a series' unit and display format: growth formats are percent whatever the level's unit.
export function numberKindFor(unit: string | undefined, format?: string): NumberKind {
    if (format === 'mom' || format === 'yoy' || format === 'sales') return 'percent';
    if (format === 'jobs' || format === 'claims') return 'count';
    const text = String(unit || '');
    if (text === 'percent' || text === '%') return 'percent';
    if (/^millions? of/i.test(text)) return 'millions';
    if (COUNT_UNIT.test(text)) return 'count';
    return 'decimal';
}

type FormatOptions = { signed?: boolean; digits?: number; locale?: string };

export function formatNumber(raw: number | string | null | undefined, kind: NumberKind, options: FormatOptions = {}): string {
    const value = typeof raw === 'string' ? (raw.trim() === '' ? Number.NaN : Number(raw)) : raw;
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    const digits = options.digits ?? DIGITS[kind];
    const rounded = Number(value.toFixed(digits));
    const text = Math.abs(rounded).toLocaleString(options.locale || 'en-US', { minimumFractionDigits: kind === 'price' ? 0 : digits, maximumFractionDigits: digits });
    // A value that rounds to zero is shown unsigned ("0.00%", not "+0.00%" or "-0.00%").
    const sign = rounded < 0 ? '-' : options.signed && rounded > 0 ? '+' : '';
    const suffix = kind === 'percent' ? '%' : kind === 'pp' ? ' pp' : '';
    return `${sign}${text}${suffix}`;
}

// Number plus unit for readouts and tiles. Percent and pp carry their own symbol; other units are appended,
// with `unitLabel` replacing the raw unit (e.g. "人" for persons).
export function formatWithUnit(raw: number | string | null | undefined, unit: string | undefined, format?: string, unitLabel?: string, options: FormatOptions = {}): string {
    const kind = numberKindFor(unit, format);
    const text = formatNumber(raw, kind, options);
    if (kind === 'percent' || kind === 'pp' || text === '—') return text;
    const label = unitLabel ?? unit;
    return label ? `${text} ${label}` : text;
}

// Axis ticks use one decimal fewer than readouts; counts stay whole.
export function formatAxisTick(value: number, kind: NumberKind, locale?: string): string {
    return formatNumber(value, kind, { digits: AXIS_DIGITS[kind], locale });
}

// Decimals for a value the source publishes as-is (e.g. a policy rate): keep its own precision, between two
// and three decimals, so 2.375% (CBC moves in 1/8 points) is not shown as 2.38%. Pass every source value the
// shown number depends on (a change uses both ends). Computed rates (MoM/YoY) use the default two decimals.
export function publishedDigits(...sources: Array<string | number | null | undefined>): number {
    const decimals = sources.map((source) => {
        const match = /\.(\d*?)0*$/.exec(String(source ?? '').trim());
        return match ? match[1].length : 0;
    });
    return Math.min(3, Math.max(2, ...decimals));
}
