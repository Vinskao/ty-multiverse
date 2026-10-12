export interface PortfolioPosition {
    code: string;
    name?: string;
    productType: string;
    direction: string;
    quantity: number;
    signedQuantity: number;
    ydQuantity: number;
    averagePrice: number;
    lastPrice: number;
    pnl: number;
    marketValue: number;
    allocationValue?: number;
    contractSizeShares?: number;
    valuationFormula?: string;
    assetPercentage: number;
}

export interface FuturesSummary {
    equity: number;
    equityAmount: number;
    availableMargin: number;
    openPositionPnl: number;
    maintenanceMargin: number;
    initialMargin: number;
    positionCount: number;
}

export interface Portfolio {
    cashBalance: number | null;
    stockCashBalance?: number | null;
    futuresAvailableCash?: number;
    balanceAvailable: boolean;
    balanceError?: string;
    accountErrors?: Record<string, string>;
    balanceDate: string;
    totalAssetsEstimated: number | null;
    totalPositionExposure: number;
    stockMarketValue?: number;
    futuresContractExposure?: number;
    futuresEquity?: number;
    leverageRatio?: number | null;
    totalPnl: number;
    positionCount: number;
    cashPercentage: number;
    positions: PortfolioPosition[];
    stockPositions?: PortfolioPosition[];
    futuresPositions?: PortfolioPosition[];
    futuresSummary?: FuturesSummary;
    summaryFormulas?: {
        cashBalance?: string | null;
        totalAssetsEstimated?: string | null;
        totalPnl?: string | null;
        leverageRatio?: string | null;
    };
    ibkr?: {
        accountId: string;
        baseCurrency: string;
        usdTwdRate: number;
        rateSource: string;
        usd: {
            cashBalance: number;
            netLiquidation: number;
            grossPositionValue: number;
            unrealizedPnl: number;
            realizedPnl: number;
        };
        twd: {
            cashBalance: number;
            netLiquidation: number;
            grossPositionValue: number;
            unrealizedPnl: number;
        };
        positions: Array<{
            code: string;
            name: string;
            assetClass: string;
            currency: string;
            quantity: number;
            averagePrice: number;
            lastPrice: number;
            marketValue: number;
            marketValueTwd: number;
            pnl: number;
            pnlTwd: number;
        }>;
        fetchedAt: string;
        source: string;
    };
    regions?: {
        taiwan: RegionFigures;
        overseas: RegionFigures;
        total: RegionFigures;
    };
    fetchedAt: string;
    source: string;
    valuationNote: string;
}

export interface RegionFigures {
    cash: number | null;
    totalAssets: number | null;
    totalPnl: number | null;
    leverage: number | null;
}

