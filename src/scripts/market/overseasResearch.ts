// Overseas (US/JP/KR) detail tabs from data persisted in maya-sawa (GET /market/dashboard/overseas/{code}?market=);
// covered by tests/market/overseasResearch.test.ts. Reads never reach the broker: IBKR bars, quotes and profiles and
// SEC companyfacts are collected into PostgreSQL in the background, so the page works while IB is logged out.

export const OVERSEAS_PRICE_SOURCE = 'ibkr:daily-price';

type Bar = { date: string; open?: number | null; high?: number | null; low?: number | null; close?: number | null; volume?: number | null };
type HistoryPoint = { date: string; code: string; name: string; sources: Record<string, Record<string, number>> };
type SecRow = Record<string, any> & { end: string; start?: string; durationDays?: number };
type SecFinancials = { source?: string; company?: string; sourceUrl?: string; quarterly?: SecRow[]; annual?: SecRow[]; cumulative?: SecRow[]; balanceSheet?: SecRow[] };
export type OverseasResearch = { code: string; market: string; daily?: Bar[]; datasets?: { financials?: { payload?: SecFinancials; fetchedAt?: string } | null; profile?: { payload?: Record<string, any> } | null } };

// Institutional flows, margin/lending and TDCC ownership are TWSE/TPEx/TDCC data with no IBKR equivalent.
export function overseasDetailTabs() {
    return ['price', 'fundamentals', 'research', 'ai-analysis'];
}

export function overseasHistoryPoints(daily: Bar[] | undefined): HistoryPoint[] {
    return (daily || []).flatMap((bar) => {
        const prices = [bar.open, bar.high, bar.low, bar.close];
        if (!bar.date || !prices.every((value) => typeof value === 'number' && Number.isFinite(value))) return [];
        const values: Record<string, number> = { open: bar.open!, high: bar.high!, low: bar.low!, close: bar.close! };
        // IBKR volume is already multiplied by its volumeFactor in the backend (shares).
        if (typeof bar.volume === 'number' && Number.isFinite(bar.volume)) values.volume_shares = bar.volume;
        return [{ date: bar.date, code: '', name: '', sources: { [OVERSEAS_PRICE_SOURCE]: values } }];
    });
}

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => (new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / DAY;
// Filers close on fiscal week ends (e.g. 2026-03-28), so match periods within 20 days of the expected end.
const findEnded = (rows: SecRow[], end: string, daysEarlier: number, extra: (row: SecRow) => boolean = () => true) =>
    rows.find((row) => Math.abs(daysBetween(end, row.end) - daysEarlier) <= 20 && extra(row));
const quarterLabel = (end: string) => `${end.slice(0, 4)}Q${Math.floor((Number(end.slice(5, 7)) - 1) / 3) + 1}`;
const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const growth = (now: unknown, base: unknown) => {
    const a = num(now), b = num(base);
    return a !== null && b !== null && b !== 0 ? (a / b - 1) * 100 : null;
};
// Diluted EPS when reported; Japanese filers without dilutive shares leave it blank and report basic EPS only.
const eps = (row?: SecRow) => row ? num(row.epsDiluted) ?? num(row.epsBasic) : null;
const diff = (now: number | null, base: number | null) => now !== null && base !== null ? now - base : null;
const ratio = (part: unknown, whole: unknown) => {
    const a = num(part), b = num(whole);
    return a !== null && b !== null && b !== 0 ? a / b * 100 : null;
};

// SEC companyfacts (and TDnet results in the same shape) -> the Taiwan fundamentals metrics shape, so renderMarketFundamentals draws both.
// QoQ needs the reported previous quarter: SEC files no single fourth quarter, so Q1 QoQ stays empty, never derived.
export function secFundamentalsMetrics(financials: SecFinancials | undefined) {
    const quarters = [...(financials?.quarterly || [])].sort((a, b) => a.end.localeCompare(b.end));
    const quarterly = quarters.map((row) => {
        const previous = findEnded(quarters, row.end, 91);
        const yearAgo = findEnded(quarters, row.end, 365);
        const margin = (key: string) => num(row[key]);
        const marginChange = (key: string, base?: SecRow) => diff(margin(key), base ? num(base[key]) : null);
        return {
            period: quarterLabel(row.end), revenueQoQ: growth(row.revenue, previous?.revenue), revenueYoY: growth(row.revenue, yearAgo?.revenue),
            epsQoQ: growth(eps(row), eps(previous)), epsYoY: growth(eps(row), eps(yearAgo)),
            grossMargin: margin('grossMarginPercent'), grossMarginQoQ: marginChange('grossMarginPercent', previous), grossMarginYoY: marginChange('grossMarginPercent', yearAgo),
            operatingMargin: margin('operatingMarginPercent'), operatingMarginQoQ: marginChange('operatingMarginPercent', previous), operatingMarginYoY: marginChange('operatingMarginPercent', yearAgo),
            netMargin: margin('netMarginPercent'), netMarginQoQ: marginChange('netMarginPercent', previous), netMarginYoY: marginChange('netMarginPercent', yearAgo),
        };
    });
    const sheets = [...(financials?.balanceSheet || [])].sort((a, b) => a.end.localeCompare(b.end));
    const debt = (row?: SecRow) => row ? ratio(row.liabilities, row.assets) : null;
    // Days of inventory: quarter-end InventoryNet ÷ that quarter's cost of revenue × 91.25 (same basis as maya-sawa).
    const quarterOf = (sheet?: SecRow) => sheet ? findEnded(quarters, sheet.end, 0) : undefined;
    const inventoryDays = (sheet?: SecRow) => {
        const inventory = num(sheet?.inventory), cost = num(quarterOf(sheet)?.costOfRevenue);
        return inventory !== null && cost !== null && cost > 0 ? inventory / cost * 91.25 : null;
    };
    const balance = sheets.map((row) => {
        const previous = findEnded(sheets, row.end, 91);
        const yearAgo = findEnded(sheets, row.end, 365);
        const inventoryYoY = growth(row.inventory, yearAgo?.inventory);
        // Current assets/liabilities are not in the collected SEC tag set, so the current ratio is unknown.
        return { period: quarterLabel(row.end), debtRatio: debt(row), debtRatioQoQ: diff(debt(row), debt(previous)),
            debtRatioYoY: diff(debt(row), debt(yearAgo)), currentRatio: null, currentRatioYoY: null, equityYoY: growth(row.equity, yearAgo?.equity),
            inventoryDays: inventoryDays(row), inventoryDaysQoQ: diff(inventoryDays(row), inventoryDays(previous)),
            inventoryDaysYoY: diff(inventoryDays(row), inventoryDays(yearAgo)),
            inventoryQoQ: growth(row.inventory, previous?.inventory), inventoryYoY,
            inventoryVsRevenueYoY: diff(inventoryYoY, growth(quarterOf(row)?.revenue, quarterOf(yearAgo)?.revenue)) };
    });
    // Cash flow is year-to-date (6M, 9M, full year); compare with the same-length period a year earlier.
    const ytd = [...(financials?.cumulative || []), ...(financials?.annual || [])].sort((a, b) => a.end.localeCompare(b.end));
    const capexShare = (row?: SecRow) => row ? ratio(row.capitalExpenditure, row.operatingCashFlow) : null;
    const cashFlow = ytd.map((row) => {
        const yearAgo = findEnded(ytd, row.end, 365, (base) => Math.abs((base.durationDays ?? 0) - (row.durationDays ?? 0)) <= 20);
        return { period: quarterLabel(row.end), ocfYoY: growth(row.operatingCashFlow, yearAgo?.operatingCashFlow),
            cashConversion: null, cashConversionYoY: null, capexToOcf: capexShare(row), capexToOcfYoY: diff(capexShare(row), capexShare(yearAgo)) };
    });
    return { monthly: [] as never[], quarterly: quarterly.slice(-8), balance: balance.slice(-8), cashFlow: cashFlow.slice(-8) };
}

const FILINGS_GAP: Record<string, string> = {
    JP: 'Japan results come from TDnet 決算短信, collected from 2026-10; this company has no release stored yet. 日本財報來自 TDnet 決算短信（2026-10 起收集），此公司尚未有公布紀錄。',
    KR: 'Korea filings (OpenDART) need an OpenDART API key; not connected yet. 韓國財報需 OpenDART API key，尚未接入。',
};

export function overseasFundamentalsPayload(research: OverseasResearch) {
    const financials = research.datasets?.financials?.payload;
    const errors = financials ? [] : [FILINGS_GAP[research.market]
        || 'No SEC companyfacts stored for this company yet. 尚未保存此公司的 SEC 財報。'];
    return {
        code: research.code, historyPending: false, errors,
        metrics: financials ? secFundamentalsMetrics(financials) : { monthly: [], quarterly: [], balance: [], cashFlow: [] },
        source: financials ? `${financials.source || 'SEC EDGAR companyfacts'} · ${financials.company || research.code}${research.market === 'US' ? ' · 10-Q / 10-K' : ''}` : 'Interactive Brokers CPAPI',
    };
}
