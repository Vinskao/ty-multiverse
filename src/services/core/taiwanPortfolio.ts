import type { Portfolio } from '../../types/portfolio';

// The API returns the unified Taiwan + IBKR portfolio. Keep the historical
// helper name for callers, but do not project away the overseas positions.
export function taiwanPortfolio(portfolio: Portfolio): Portfolio {
    return portfolio;
}

