# IBKR overseas data collection

## Verified source inventory (2026-10-16)

Existing integration used portfolio accounts, positions, ledger and summary only. Newly verified against the authenticated production Gateway for META (US), LITE (US), 6857 (JP Advantest), 6524 (JP Kohoku), 000660 (KR SK Hynix):

| Source | Data | Storage / refresh |
| --- | --- | --- |
| `/iserver/contract/{conid}/info` | company name, symbol, currency, exchange, sector/category | PostgreSQL; weekly |
| `/iserver/marketdata/history` | initial one-year daily OHLCV; incremental week after initial backfill | PostgreSQL raw response and dated normalized bars; six-hour refresh |
| `/iserver/marketdata/snapshot` | last, high/low, change, bid/ask, volume, historical volatility, availability when entitled | PostgreSQL; 240 seconds; preflight retry; missing permissions back off one hour |
| existing portfolio snapshot | private positions and valuation | PostgreSQL first, Redis cache second; 15-minute archive buckets; DB fallback after Redis loss |

Research requests read DB with a 60-second local process cache; never call the Gateway on a page request. Contract identity is market + code + IB conid. A failed/empty fetch records status without erasing last successful data. Quote archive buckets are 15 minutes. The daily bar timestamp is converted using each market's timezone. Raw OHLC prices are already scaled; volume is multiplied by `volumeFactor`, while raw volume and factor are retained. Invalid zero-price bars are retained in raw source responses but excluded from normalized analysis bars.

Public endpoint: `/api/market/dashboard/overseas/{code}?market=US|JP|KR|HK`. It exposes only public instrument/market datasets. Reserved private account snapshots have no public read route. Never include account IDs, quantities, cost, value or P/L in research responses.

## Confirmed source gaps

IBKR Web API changelog (2026-01-06) deprecated EPS, PE, market capitalization, dividends/yield, ex-date and beta snapshot fields. CPAPI endpoints above do not provide complete quarterly statements, analyst consensus, Taiwan-style institutional flows, ownership tiers or short interest. No paid regulatory snapshots, new market subscriptions or paid providers are enabled. Sources still needed for these datasets: official US SEC/company filings; Japan company IR/EDINET (check key requirements); Korea company IR/OpenDART (key required). Do not invent these fields or map overseas numeric codes to TWSE/TPEx.

Official references:
- https://www.interactivebrokers.com/docs/web-api/changelog
- https://www.interactivebrokers.com/docs/web-api/v1/endpoints/market-data/historical-market-data
- https://www.interactivebrokers.com/docs/web-api/v1/endpoints/market-data/market-data-fields
- https://www.interactivebrokers.com/docs/web-api/v1/endpoints/contract/contract-information-by-contract-id

## Verification

Backend: `poetry run python -m pytest tests/test_ibkr_research.py tests/test_market_dashboard.py tests/test_market_brief.py -q`.
Read the public endpoint after deployment; verify profile conid/company/exchange, daily count and dates, persisted=true, source coverage, gaps and quote availability for all five holdings. A new DB instance must be able to read the same data without Redis. Confirm Jenkins success and the production image revision before claiming deployment complete.
