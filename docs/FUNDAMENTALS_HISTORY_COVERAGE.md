# Fundamental history coverage

Updated: 2026-10-29

## Target window

The fundamentals views and metrics retain five years: 60 monthly observations and 20 quarters. Taiwan's monthly revenue, income statement, balance sheet, and cash-flow series are collected from FinMind into PostgreSQL for stocks in the user's active market selection. A stock opened in the fundamentals view is also queued for collection. The existing collector refreshes each dataset at most once per 24 hours and uses an account-wide 120-request/hour safety limit; four dataset requests are needed per stock. Data therefore fills asynchronously after deployment, and a large watch list can take multiple hours to backfill. This is not a full-market crawl.

The persisted FinMind rows are upserted and retained. The first fetch after this change requests data beginning five calendar years before the run date; existing rows are not deleted. Taiwan's official TWSE/MOPS in-memory feeds remain a current-data overlay and do not constitute the five-year database history.

## Other supported markets

| Market | Source / storage | Five-year behavior | Constraint |
| --- | --- | --- | --- |
| Taiwan | FinMind PostgreSQL history; TWSE/MOPS current overlay | 60 months / 20 quarters; four current datasets | Collection is limited to selected or opened stocks and is paced by the existing quota guard. FinMind Free is licensed for non-commercial use; commercial SaaS use requires Sponsor Pro and attribution. |
| US | SEC EDGAR Company Facts in PostgreSQL | Up to 20 quarters / balance-sheet dates, 10 cumulative periods, and 5 annual periods | Since 2026-10-29 any US ticker is resolved through SEC's own ticker map (`company_tickers.json`, about 10,400 tickers, fetched at most daily; `resolve_sec_cik`). Foreign issuers that file 20-F under IFRS (e.g. TSM) have no us-gaap quarterly facts and are marked unavailable. |
| Korea | OpenDART periodic filings in PostgreSQL | Filing search now requests five calendar years; shared output keeps 20 quarters / balance dates, 10 cumulative periods, and 5 annual periods | Requires the existing OpenDART API key and a mapped/held stock code. |
| Japan | J-Quants summary plus stored TDnet releases in PostgreSQL | The processing and display layers retain up to five years when the source has it | Current J-Quants Free plan only provides two years and with a 12-week delay. A five-year historical backfill requires a paid J-Quants plan; no plan change is included. TDnet by itself only supplies recent disclosures. |

## Alternatives for the remaining gaps (2026-10-29)

| Gap | Alternative | Cost / decision needed |
| --- | --- | --- |
| Japan: J-Quants Free has two years, 12 weeks late | EDINET API v2 (Financial Services Agency): securities reports (有価証券報告書) and semiannual reports with XBRL, kept about five years. Japan stopped quarterly securities reports from April 2024, so EDINET gives annual and half-year figures; quarters stay with J-Quants/TDnet. | Free, but needs an EDINET API key that the owner registers; store it as a Jenkins credential. Or pay for a J-Quants plan with five years. |
| Taiwan: only selected or opened stocks | Official whole-market tables (TWSE/TPEx open data and MOPS summary reports) return every listed company for one month or one quarter per request, so five years of the whole market is a few hundred requests instead of four per stock. | Decide whether a full-market screen is wanted; it adds about 1,800 companies of rows to the small PostgreSQL. |
| FinMind Free is non-commercial | Keep FinMind if the site stays personal and non-commercial (with attribution). If the site becomes commercial, move Taiwan history to the official tables above, which are government open data that allow reuse with attribution (check each dataset's terms). | Owner decides whether the site is commercial. |

## Taiwan whole market from MOPS (2026-10-29)

maya-sawa `services/mops_fundamentals.py` backfills five years for every listed (sii) and OTC company from MOPS summary pages. Each page returns every company for one period, so the whole market is about 240 pages, not four requests per stock:

| Data | MOPS page | Period | Stored as |
| --- | --- | --- | --- |
| Monthly revenue | `t21sc03` | 60 months | `TaiwanStockMonthRevenue` / `revenue` |
| Income statement | `ajax_t163sb04` | 20 quarters | `TaiwanStockFinancialStatements`: Revenue, CostOfGoodsSold, GrossProfit, OperatingIncome, IncomeAfterTaxes, EPS |
| Balance sheet | `ajax_t163sb05` | 20 quarters | `TaiwanStockBalanceSheet`: CurrentAssets, TotalAssets, CurrentLiabilities, Liabilities, equity |
| Cash flow | `ajax_t163sb20` | 20 quarters | `TaiwanStockCashFlowsStatement`: operating cash flow, plus year-to-date pre-tax income |

- MOPS amounts are NT$ thousand and statements are year to date. They are stored in yuan, and single quarters are the difference of consecutive year-to-date values; a quarter is skipped when the quarter before it is missing.
- Columns are matched by name in each industry table (general, bank, securities, insurance, holding, other). Banks have no revenue or gross-profit line, so only the lines they report are kept.
- Items use FinMind's names, so the metrics code is unchanged. Writes replace only these items, so FinMind items stay for the same period.
- The collector waits 8 seconds between pages and stops a pass when MOPS answers 「查詢過於頻繁」. Passes run every 10 minutes while the backlog lasts, then hourly. The last two months and quarters are refetched each pass. Checkpoints are in `maya_sawa_mops_checkpoint`; set `MOPS_FUNDAMENTALS_ENABLED=0` to turn the collector off.
- Inventory (inventory days) and capex (capex / operating cash flow) are not in the summaries. For now they still come from FinMind for selected or opened stocks. The next step is per-company MOPS statements for those stocks, after which FinMind can be switched off.
- Tests: maya-sawa `tests/test_mops_fundamentals.py`. Fixtures are real 2026 pages that keep every table and header and the rows of 2330, 1101, 2801, 2855 and 6488. A live run on 2026-10-29 wrote 866 OTC companies' September revenue and the 2026Q2 OTC statements.

## Japan via EDINET (in progress)

The owner registered an EDINET API key on 2026-10-29. It belongs in Jenkins as Secret text `EDINET_API_KEY`, never in chat, the repo or logs. EDINET support will be built once the key is in Jenkins, so fixtures can be captured from real responses.

## What this change does not add

The five-year window applies to the fundamentals already collected by the site. It does not add new datasets such as dividend history, analyst estimates, or market valuation series, and it does not cause an all-listed-stock Taiwan backfill.

## Primary source references

- [FinMind plans and licensing](https://finmind.github.io/Pricing/)
- [J-Quants API data periods by subscription](https://jpx-jquants.com/en/spec/data-spec)
- [OpenDART developer guides](https://opendart.fss.or.kr/guide/main.do)
