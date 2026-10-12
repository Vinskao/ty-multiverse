import type { Portfolio } from '../../types/portfolio';

// Project both fresh responses and old browser caches onto the Taiwan figures.
// Keep IBKR integrations intact while the overseas dashboard is paused.
export function taiwanPortfolio(portfolio: Portfolio): Portfolio {
    const tw = portfolio.regions?.taiwan;
    if (!tw) return portfolio.ibkr ? { ...portfolio, ibkr: undefined } : portfolio;
    const formulas = Object.fromEntries(Object.entries(portfolio.summaryFormulas ?? {})
        .map(([key, value]) => [key, value?.replace(/ \+ IBKR .*$/, '')]));
    return {
        ...portfolio,
        cashBalance: tw.cash,
        totalAssetsEstimated: tw.totalAssets,
        totalPnl: tw.totalPnl ?? portfolio.positions.reduce((sum, p) => sum + p.pnl, 0),
        leverageRatio: tw.leverage,
        ibkr: undefined,
        regions: { taiwan: tw, total: tw, overseas: { cash: 0, totalAssets: 0, totalPnl: 0, leverage: null } },
        summaryFormulas: formulas,
        valuationNote: portfolio.valuationNote.replace(/; includes IBKR.*$/i, ''),
    };
}

