// Which macro series share a chart, per dashboard card; covered by tests/market/macroLayout.test.ts.

// Related series are compared in one chart: the first code is the base line, the rest are comparison lines with
// every value in one readout (AGENTS.md: one chart per shape). Cards listed here draw their charts below the
// metric tiles instead of one chart per tile. "a|b" means the first code that has data.
/** 2026-11-17: first on the macro page, Taiwan margin leverage on its own: the margin loan balance (NT$ 100m, left axis),
 *  the market-wide maintenance ratio (%, right axis) and margin-call accounts (outer right axis): accounts whose whole-account
 *  ratio is below 130%, from the TWSE 臺股儀表板 (BFIJ3U, the dashboard's 追繳戶數). */
export const MACRO_LEVERAGE_CHART = {
    id: 'tw-leverage', codes: ['TW_MARGIN_BALANCE', 'TW_MARGIN_MAINTENANCE', 'TW_MARGIN_CALL_ACCOUNTS'] as readonly string[],
    title: { zh: '台股融資餘額、融資維持率與追繳戶數', en: 'Taiwan margin loans, maintenance ratio and margin-call accounts' },
    note: { zh: '上市融資餘額（億元，左軸）與大盤融資維持率（%，右軸，以擔保品市值除以融資金額估算）。維持率跌近 130% 時券商開始追繳；追繳戶數為整戶維持率低於 130% 的戶數（證交所臺股儀表板，外側右軸）。',
        en: 'TWSE margin loan balance (NT$ 100m, left) and the market-wide maintenance ratio (%, right; collateral value over margin loans). Brokers start margin calls near 130%; margin-call accounts are those below 130% (TWSE dashboard, outer right).' },
} as const;

/** 2026-11-16: above the borrowing charts, the two volatility indexes, Taiwan left and U.S. right. Each draws its stored
 *  daily closes with the live reading as today's last point (macroLive.ts), refreshed every minute. */
export const MACRO_VOLATILITY_CHARTS = [
    { id: 'tw-vix', code: 'TW_VIX', compare: [] as readonly string[], title: { zh: '台指選擇權波動率指數（台灣 VIX）', en: 'Taiwan VIX (TAIEX options volatility index)' },
      note: { zh: '期交所以台指選擇權價格算出的 30 天預期波動，台股的恐慌指標；數值越高代表市場預期震盪越大。盤中約每分鐘更新。',
        en: 'The 30-day expected volatility implied by TAIEX options (TAIFEX), the Taiwan fear gauge; higher means a bigger expected swing. Updated about every minute while the market trades.' } },
    { id: 'us-vix', code: 'US_VIX', compare: ['VIX_FUT_FRONT'] as readonly string[], title: { zh: '美國 VIX 恐慌指數', en: 'CBOE VIX (U.S. fear index)' },
      note: { zh: 'CBOE 以 S&P 500 選擇權算出的 30 天預期波動。美股交易時段約每分鐘更新，休市時顯示最近一次收盤。另畫 VIX 近月期貨每日結算價（芝加哥期貨交易所）；期貨夜間沒有免費即時價，夜間改看 VIXY 盤前盤後當替代指標。',
        en: 'The 30-day expected volatility implied by S&P 500 options (CBOE). Updates about every minute while U.S. markets trade. The second line is the Cboe front-month VIX futures settlement; there is no free overnight futures price, so overnight shows VIXY (a VIX futures ETF) as a stand-in.' } },
] as const;

/** 2026-11-13: the two charts that open the macro page, left 場內 and right 場外. Each stays one frequency
 *  (left daily, right monthly) per the rule below. Broker margin rates have no official series, so 場內 shows the
 *  money-market rates brokers fund margin loans against. */
export const MACRO_BORROWING_CHARTS = [
    { id: 'exchange', title: { zh: '場內｜券商融資的資金基準（日）', en: 'On-exchange · margin funding benchmarks (daily)' },
      note: { zh: '券商融資利率由各券商自訂，沒有官方統計；這裡畫它的資金成本：金融業隔夜拆款利率與央行重貼現率、擔保放款、短期融通利率。',
        en: 'Brokers set their own margin rates and no official series exists; this shows their funding cost: the interbank overnight rate and the CBC rediscount, secured-loan and short-term-loan rates.' },
      codes: ['TW_INTERBANK_OVERNIGHT', 'CBC_REDISCOUNT', 'CBC_SECURED_LOAN', 'CBC_SHORT_TERM_LOAN'] },
    { id: 'off-exchange', title: { zh: '場外｜銀行借款實際利率（月）', en: 'Off-exchange · bank borrowing rates (monthly)' },
      note: { zh: '五大銀行新承做放款加權平均利率（央行）。消費性貸款最接近信貸與股票質押借款；實際利率依個人條件而定。',
        en: 'Five major banks, new loans, weighted average (CBC). Consumer loans are the closest public proxy for personal and stock-pledge loans; actual rates depend on the borrower.' },
      codes: ['TW_CONSUMER_LOAN_RATE', 'TW_WORKING_CAPITAL_LOAN_RATE', 'TW_BANK_LOAN_RATE'] },
] as const;

export const MACRO_MERGED_CHARTS: Record<string, readonly (readonly string[])[]> = {
    // U.S. and Taiwan unemployment rates (both percent of the labour force) share one chart.
    employment: [['CES0000000001'], ['LNS14000000', 'TW_UNEMPLOYMENT_RATE', 'LRUNTTTTJPM156S', 'LRUNTTTTKRM156S'], ['ICSA']],
    // Daily series only share a chart with daily series: monthly (YYYY-MM) periods would interleave out of order
    // with dates, so Japan's monthly call rate and the BoJ balance sheet get their own charts.
    rates: [['DFEDTARU', 'DFEDTARL', 'SOFR'], ['DGS3MO', 'DGS2', 'DGS10'], ['T10Y2Y', 'T10Y3M'], ['DFII10', 'T10YIE'],
        ['ECBDFR', 'IUDSOIA'], ['IRSTCI01JPM156N', 'IRSTCI01KRM156N'],
        // Five-economy policy rates on one daily axis: rate gaps show where carry money is pulled (2026-10-29).
        ['POLICY_RATE_TW', 'POLICY_RATE_US', 'POLICY_RATE_EZ', 'POLICY_RATE_JP', 'POLICY_RATE_KR'],
        // What borrowing to invest costs in Taiwan, also drawn side by side at the top of the page (MACRO_BORROWING_CHARTS).
        // The 場內 chart carries the three CBC policy rates, which had a chart of their own until 2026-11-13.
        ...MACRO_BORROWING_CHARTS.map((chart) => chart.codes)],
    // Fed total assets with net liquidity, then the two drains (TGA, ON RRP) on their own scale: on one axis the
    // ~6,800B balance sheet flattened a 0-2,500B reverse repo. Money supply is the "money" growth chart.
    liquidity: [['WALCL', 'US_NET_LIQUIDITY_DAILY|US_NET_LIQUIDITY'], ['TGA_DAILY|WTREGEN', 'RRPONTSYD'], ['ECBASSETSW'], ['JPNASSETS']],
    credit: [['BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAA10Y'], ['DRALACBS', 'DRBLACBS', 'DRSFRMACBS', 'DRCCLACBS', 'CORCCACBS'], ['STLFSI4', 'NFCI']],
    'taiwan-employment': [['TW_EMPLOYED', 'TW_UNEMPLOYED']],
    pmi: [['TW_PMI', 'TW_NMI']],
    'tw-forecast': [['TIER_TW_GDP_FORECAST', 'TIER_TW_CPI_FORECAST']],
    // Yearly population of the four economies, indexed to the first year so a 343m and a 23m country share one axis.
    population: [['US_POPULATION', 'JP_POPULATION', 'TW_POPULATION', 'KR_POPULATION']],
    // Gold and oil histories in one chart. TPEx publishes only the latest Taiwan spot quote (tile only), so gold's
    // trend comes from COMEX futures, or the World Bank monthly average if COMEX is unavailable.
    commodities: [['COMEX_GOLD_USD|WORLD_GOLD_USD', 'WTI_CRUDE_USD|DCOILWTICO']],
    // Exchange rates and Taiwan trade sit in one card: this currency chart, plus the export/import growth chart
    // with its MoM/YoY toggle (macroGrowth.ts, chart "trade").
    // Taiwan, Japan, Korea, the euro and the dollar index as strength against the dollar on one shared start (100).
    'fx-trade': [['CBC_USD_TWD', 'USD_JPY', 'USD_KRW|DEXKOUS', 'EUR_USD', 'US_DOLLAR_INDEX']],
    // All daily, one shared time axis, one y-axis per unit (macroAxisPlan): margin balance and trading value (NT$ 100m,
    // left), VIX (right), the TX roll spread above fair carry (TAIEX points, outer right), maintenance ratio (%, outer
    // left). The raw calendar spread is drawn alone: it shares its unit with the excess but a series is drawn only once.
    // Margin balance and maintenance ratio moved to MACRO_LEVERAGE_CHART at the top of the page (2026-11-17).
    'market-risk': [['TW_MARKET_TURNOVER', 'US_VIX', 'TX_ROLL_EXCESS_SPREAD'], ['TX_CALENDAR_SPREAD']],
};

// The unit a series is plotted in: growth formats are percent whatever the level's unit.
function plottedUnit(series: { format: string; unit: string }) {
    if (['mom', 'yoy', 'sales'].includes(series.format) || series.unit === 'percent') return '%';
    if (series.format === 'rebased' || series.format === 'fx-strength') return 'index';
    if (series.format === 'jobs') return 'persons per month';
    return series.unit;
}

// Series in different plotted units share the date axis but each gets its own colored y-axis (max three),
// so no hand-kept list is needed when a chart is added.
/** The y-axis of each series: one per distinct plotted unit in order of first appearance, at most four (0 left, 1 right,
 *  2 outer right, 3 outer left). Same-unit series share an axis so their levels stay comparable. */
export function macroAxisPlan(series: ReadonlyArray<{ format: string; unit: string }>): number[] {
    const units: string[] = [];
    return series.map((item) => {
        const unit = plottedUnit(item);
        if (!units.includes(unit)) units.push(unit);
        return Math.min(units.indexOf(unit), 3);
    });
}

export function macroChartNeedsSeparateAxes(series: ReadonlyArray<{ format: string; unit: string }>) {
    return new Set(series.map(plottedUnit)).size > 1;
}

// Every chart carries a visible title naming what it draws: one series by its name, two as "A vs B", more as a list.
export function macroChartTitle(labels: readonly string[]): string {
    const names = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
    return names.join(names.length === 2 ? ' vs ' : ' / ');
}
