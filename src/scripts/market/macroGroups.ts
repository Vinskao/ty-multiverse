// Which tiles each macro dashboard card shows, in order; covered by tests/market/macroGroups.test.ts.
// Each theme pairs the indicators it reports with the calendar group that announces them,
// so the latest reading and the next release sit in the same card. index.ts only renders these.

import type { MacroSeriesFormat } from './macroSeries';

// Inline bilingual text, or an i18n.json home.* key with its English fallback.
export type MacroText = { en: string; zh: string } | { key: string; en: string };
export type MacroMetricSpec = { code: string; label: MacroText; format: MacroSeriesFormat };
export type MacroGroupSpec = { id: string; eventGroups: readonly string[]; title: MacroText; metrics: readonly MacroMetricSpec[] };

const m = (code: string, en: string, zh: string, format: MacroSeriesFormat): MacroMetricSpec => ({ code, label: { en, zh }, format });
const k = (code: string, key: string, en: string, format: MacroSeriesFormat): MacroMetricSpec => ({ code, label: { key, en }, format });

export const MACRO_GROUP_SPECS: readonly MacroGroupSpec[] = [
    { id: 'employment', eventGroups: ['employment', 'claims'], title: { en: 'Labor market', zh: '就業' }, metrics: [
        k('CES0000000001', 'macroPayrolls', 'Nonfarm payrolls', 'jobs'),
        k('LNS14000000', 'macroUnemployment', 'Unemployment rate', 'percent'),
        m('TW_UNEMPLOYMENT_RATE', 'Taiwan unemployment rate', '台灣失業率', 'percent'),
        m('LRUNTTTTJPM156S', 'Japan unemployment rate (SA)', '日本失業率（季調）', 'percent'),
        m('LRUNTTTTKRM156S', 'Korea unemployment rate (SA)', '韓國失業率（季調）', 'percent'),
        m('ICSA', 'Initial unemployment claims', '初領失業救濟金人數', 'claims'),
    ] },
    { id: 'inflation', eventGroups: ['cpi', 'ppi'], title: { en: 'Inflation', zh: '通膨' }, metrics: [
        k('CUSR0000SA0', 'macroCpiMonthly', 'CPI · monthly', 'mom'),
        k('CUUR0000SA0', 'macroCpiAnnual', 'CPI · annual', 'yoy'),
        k('CUSR0000SA0L1E', 'macroCoreCpiMonthly', 'Core CPI · monthly', 'mom'),
        k('CUUR0000SA0L1E', 'macroCoreCpiAnnual', 'Core CPI · annual', 'yoy'),
        m('TW_CPI', 'Taiwan CPI · annual', '台灣 CPI 年增率', 'yoy'),
        m('JP_CPI', 'Japan CPI (BIS) · annual', '日本 CPI（BIS）年增率', 'yoy'),
        m('KR_CPI', 'Korea CPI (BIS) · annual', '韓國 CPI（BIS）年增率', 'yoy'),
        m('WPUFD4', 'U.S. producer prices · final demand', '美國生產者物價指數 · 最終需求', 'yoy'),
        m('TW_PPI', 'Taiwan producer price index', '台灣生產者物價指數', 'yoy'),
    ] },
    { id: 'rates', eventGroups: ['fed'], title: { en: 'Interest rates', zh: '利率' }, metrics: [
        k('DFEDTARL', 'macroFedTargetLower', 'Fed target · lower', 'percent'),
        k('DFEDTARU', 'macroFedTargetUpper', 'Fed target · upper', 'percent'),
        m('SOFR', 'SOFR (secured overnight rate)', 'SOFR 擔保隔夜融資利率', 'percent'),
        m('DGS3MO', '3-month Treasury yield', '美國 3 個月期公債殖利率', 'percent'),
        m('DGS2', '2-year Treasury yield', '美國 2 年期公債殖利率', 'percent'),
        k('DGS10', 'macroTreasuryYield10', '10-year Treasury yield', 'percent'),
        m('T10Y2Y', '10Y − 2Y Treasury spread', '美債 10 年減 2 年利差', 'percent'),
        m('T10Y3M', '10Y − 3M Treasury spread', '美債 10 年減 3 個月利差', 'percent'),
        m('DFII10', '10-year real yield (TIPS)', '美國 10 年期實質殖利率 (TIPS)', 'percent'),
        m('T10YIE', '10-year breakeven inflation', '美國 10 年期損益兩平通膨率', 'percent'),
        m('ECBDFR', 'ECB deposit facility rate', '歐洲央行存款機制利率', 'percent'),
        m('IUDSOIA', 'UK SONIA overnight rate', '英國 SONIA 隔夜利率', 'percent'),
        m('IRSTCI01JPM156N', 'Japan overnight call rate', '日本無擔保隔夜拆款利率', 'percent'),
        m('IRSTCI01KRM156N', 'Korea overnight call rate', '韓國隔夜拆款利率', 'percent'),
        m('CBC_REDISCOUNT', 'Taiwan CBC rediscount rate', '台灣央行重貼現率', 'percent'),
        m('CBC_SECURED_LOAN', 'Taiwan CBC secured loan rate', '台灣央行擔保放款利率', 'percent'),
        m('CBC_SHORT_TERM_LOAN', 'Taiwan CBC short-term loan rate', '台灣央行短期融通利率', 'percent'),
    ] },
    // Money stocks are compared as growth rates (levels are in four currencies); balance sheets and the Fed's
    // net liquidity (total assets − Treasury General Account − overnight reverse repo) are levels.
    { id: 'liquidity', eventGroups: [], title: { en: 'Money supply and liquidity', zh: '貨幣供給與流動性' }, metrics: [
        m('M2SL', 'U.S. M2 · annual', '美國 M2 年增率', 'yoy'),
        m('EZ_M2_INDEX', 'Euro area M2 · annual', '歐元區 M2 年增率', 'yoy'),
        m('JP_M2', 'Japan M2 · annual', '日本 M2 年增率', 'yoy'),
        m('TW_M2', 'Taiwan M2 · annual', '台灣 M2 年增率', 'yoy'),
        m('TW_M1B', 'Taiwan M1B · annual', '台灣 M1B 年增率', 'yoy'),
        m('WALCL', 'Fed total assets', 'Fed 資產負債表總資產', 'raw'),
        m('US_NET_LIQUIDITY', 'Fed net liquidity', 'Fed 淨流動性', 'raw'),
        m('WTREGEN', 'Treasury General Account', '美國財政部 TGA 帳戶', 'raw'),
        m('RRPONTSYD', 'Overnight reverse repo', 'Fed 隔夜逆回購', 'raw'),
        m('ECBASSETSW', 'Eurosystem total assets', '歐洲央行體系總資產', 'raw'),
        m('JPNASSETS', 'Bank of Japan total assets', '日本央行總資產', 'raw'),
    ] },
    // Free official data has no corporate default rate (Moody's / S&P series are paid): spreads price default
    // risk, and bank delinquency / charge-off rates are the realized credit losses.
    { id: 'credit', eventGroups: [], title: { en: 'Credit and default risk', zh: '信用與違約風險' }, metrics: [
        m('BAMLH0A0HYM2', 'U.S. high-yield spread (OAS)', '美國高收益債利差 (OAS)', 'percent'),
        m('BAMLC0A0CM', 'U.S. investment-grade spread (OAS)', '美國投資級公司債利差 (OAS)', 'percent'),
        m('BAA10Y', "Moody's Baa − 10Y Treasury", '穆迪 Baa 公司債減 10 年美債', 'percent'),
        m('DRALACBS', 'Bank delinquency · all loans', '銀行逾期率 · 全部放款', 'percent'),
        m('DRBLACBS', 'Bank delinquency · business loans', '銀行逾期率 · 企業放款', 'percent'),
        m('DRSFRMACBS', 'Bank delinquency · home mortgages', '銀行逾期率 · 住宅房貸', 'percent'),
        m('DRCCLACBS', 'Bank delinquency · credit cards', '銀行逾期率 · 信用卡', 'percent'),
        m('CORCCACBS', 'Credit card net charge-off rate', '信用卡淨沖銷率', 'percent'),
        m('STLFSI4', 'St. Louis Fed financial stress (0 = normal)', '聖路易 Fed 金融壓力指數 (0 = 正常)', 'raw'),
        m('NFCI', 'Chicago Fed financial conditions (0 = average)', '芝加哥 Fed 金融狀況指數 (0 = 平均)', 'raw'),
    ] },
    { id: 'commodities', eventGroups: [], title: { en: 'Commodities', zh: '商品價格' }, metrics: [
        m('COMEX_GOLD_USD', 'COMEX gold futures', '美國 COMEX 黃金期貨', 'raw'),
        m('WORLD_GOLD_USD', 'World gold monthly average', '國際黃金月均價', 'raw'),
        m('DCOILWTICO', 'WTI crude oil', 'WTI 原油', 'raw'),
    ] },
    // Leverage, activity and fear in one card: margin loan balance (MI_MARGN) and trading value (FMTQIK), both NT$ 100
    // million, beside the CBOE VIX close. TWSE publishes no market-wide margin ratio, so maya-sawa computes it daily
    // from MI_MARGN and MI_INDEX (collateral value / margin loans).
    { id: 'market-risk', eventGroups: [], title: { en: 'Market risk sentiment', zh: '市場風險情緒' }, metrics: [
        m('TW_MARGIN_BALANCE', 'Taiwan margin loan balance (TWSE listed, NT$ 100m)', '台股融資餘額（上市，億元）', 'raw'),
        m('TW_MARKET_TURNOVER', 'Taiwan market trading value (TWSE listed, NT$ 100m)', '台股成交量（上市成交金額，億元）', 'raw'),
        m('US_VIX', 'CBOE VIX (fear index)', '美國 VIX 恐慌指數', 'raw'),
        m('TX_ROLL_EXCESS_SPREAD', 'TAIEX futures roll spread above fair carry (points)', '台指期轉倉超額價差（點，扣利率與股利）', 'raw'),
        m('TW_MARGIN_MAINTENANCE', 'Taiwan margin maintenance ratio (TWSE listed)', '台股融資維持率（上市大盤）', 'percent'),
        m('TX_CALENDAR_SPREAD', 'TAIEX futures next minus near month (points)', '台指期次月減近月價差（點）', 'raw'),
    ] },
    { id: 'fx-trade', eventGroups: [], title: { en: 'Exchange rates and Taiwan trade', zh: '匯率與台灣進出口' }, metrics: [
        m('CBC_USD_TWD', 'Interbank USD/TWD close', '銀行間美元兌新台幣收盤', 'raw'),
        m('USD_JPY', 'USD/JPY (yen per dollar)', '美元兌日圓', 'raw'),
        m('US_DOLLAR_INDEX', 'U.S. Dollar Index (DXY)', '美元指數 (DXY)', 'raw'),
        m('TW_EXPORTS', 'Exports', '出口總值', 'yoy'),
        m('TW_IMPORTS', 'Imports', '進口總值', 'yoy'),
        m('DEXKOUS', 'USD/KRW (won per dollar)', '美元兌韓元', 'raw'),
        m('XTEXVA01JPM667S', 'Japan exports (USD, SA)', '日本商品出口（美元、季調）', 'yoy'),
        m('XTIMVA01JPM667S', 'Japan imports (USD, SA)', '日本商品進口（美元、季調）', 'yoy'),
        m('XTEXVA01KRM667S', 'Korea exports (USD, SA)', '韓國商品出口（美元、季調）', 'yoy'),
        m('XTIMVA01KRM667S', 'Korea imports (USD, SA)', '韓國商品進口（美元、季調）', 'yoy'),
    ] },
    { id: 'taiwan-employment', eventGroups: [], title: { en: 'Taiwan labor market', zh: '台灣就業' }, metrics: [
        m('TW_EMPLOYED', 'Employed persons', '就業人數', 'jobs'),
        m('TW_UNEMPLOYED', 'Unemployed persons', '失業人數', 'jobs'),
    ] },
    { id: 'consumption', eventGroups: ['retail_sales'], title: { en: 'Consumption', zh: '消費' }, metrics: [
        k('RSAFS', 'macroRetailSales', 'Retail sales and food services', 'sales'),
        m('GBRSLRTTO01GPSAM', 'UK retail sales · month over month', '英國零售銷售 · 月增率', 'raw'),
        m('GBRSLRTTO01GYSAM', 'UK retail sales · year over year', '英國零售銷售 · 年增率', 'raw'),
        m('JPNSLRTTO01GPSAM', 'Japan retail volume · monthly', '日本零售銷售量 · 月增率', 'raw'),
        m('JPNSLRTTO01GYSAM', 'Japan retail volume · annual', '日本零售銷售量 · 年增率', 'raw'),
        m('KORSLRTTO01GPSAM', 'Korea retail volume · monthly', '韓國零售銷售量 · 月增率', 'raw'),
        m('KORSLRTTO01GYSAM', 'Korea retail volume · annual', '韓國零售銷售量 · 年增率', 'raw'),
    ] },
    { id: 'pmi', eventGroups: [], title: { en: 'Purchasing managers indexes', zh: '採購經理人指數' }, metrics: [
        m('TW_PMI', 'Taiwan manufacturing PMI', '台灣製造業 PMI', 'raw'),
        m('TW_NMI', 'Taiwan non-manufacturing NMI', '台灣非製造業 NMI', 'raw'),
    ] },
];
