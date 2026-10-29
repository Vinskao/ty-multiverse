# Fundamental history coverage

Updated: 2026-10-29

## Target window

The fundamentals views and metrics retain five years: 60 monthly observations and 20 quarters. Taiwan's monthly revenue, income statement, balance sheet, and cash-flow series are collected from FinMind into PostgreSQL for stocks in the user's active market selection. A stock opened in the fundamentals view is also queued for collection. The existing collector refreshes each dataset at most once per 24 hours and uses an account-wide 120-request/hour safety limit; four dataset requests are needed per stock. Data therefore fills asynchronously after deployment, and a large watch list can take multiple hours to backfill. This is not a full-market crawl.

The persisted FinMind rows are upserted and retained. The first fetch after this change requests data beginning five calendar years before the run date; existing rows are not deleted. Taiwan's official TWSE/MOPS in-memory feeds remain a current-data overlay and do not constitute the five-year database history.

## Other supported markets

| Market | Source / storage | Five-year behavior | Constraint |
| --- | --- | --- | --- |
| Taiwan | FinMind PostgreSQL history; TWSE/MOPS current overlay | 60 months / 20 quarters; four current datasets | Collection is limited to selected or opened stocks and is paced by the existing quota guard. FinMind Free is licensed for non-commercial use; commercial SaaS use requires Sponsor Pro and attribution. |
| US | SEC EDGAR Company Facts in PostgreSQL | Up to 20 quarters / balance-sheet dates, 10 cumulative periods, and 5 annual periods | SEC CIK mapping currently covers META and LITE only. Other US tickers need a CIK mapping before the collector can ingest them. |
| Korea | OpenDART periodic filings in PostgreSQL | Filing search now requests five calendar years; shared output keeps 20 quarters / balance dates, 10 cumulative periods, and 5 annual periods | Requires the existing OpenDART API key and a mapped/held stock code. |
| Japan | J-Quants summary plus stored TDnet releases in PostgreSQL | The processing and display layers retain up to five years when the source has it | Current J-Quants Free plan only provides two years and with a 12-week delay. A five-year historical backfill requires a paid J-Quants plan; no plan change is included. TDnet by itself only supplies recent disclosures. |

## What this change does not add

The five-year window applies to the fundamentals already collected by the site. It does not add new datasets such as dividend history, analyst estimates, or market valuation series, and it does not cause an all-listed-stock Taiwan backfill.

## Primary source references

- [FinMind plans and licensing](https://finmind.github.io/Pricing/)
- [J-Quants API data periods by subscription](https://jpx-jquants.com/en/spec/data-spec)
- [OpenDART developer guides](https://opendart.fss.or.kr/guide/main.do)
