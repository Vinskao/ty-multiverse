# Shared chart time windows and price comparisons

Implemented 2026-10-23.

- All dashboard time-series charts (OHLC/volume, institutional flows, margin/lending,
  ownership, financial statements, macro and portfolio value) use `chartViewport.ts`.
  The allocation donuts have no time axis and retain their existing slice interaction.
- Presets mean trailing calendar windows: latest observation/day, 7 calendar days,
  one calendar month, one calendar year, five calendar years, and all available data.
  They do not turn daily bars into intraday bars or fabricate observations for holidays.
  Month/quarter observations use their period end. The latest stored observation anchors
  presets, so delayed releases do not yield a blank chart just because today is later.
- The mouse wheel over a chart zooms its data window around the pointer. Axes and
  readouts are redrawn from the visible observations. Preset buttons reset custom zoom.
  Each chart remembers its preset in localStorage; custom zoom stays in page memory.
- The price chart preserves OHLC, volume, hover/tap, keyboard navigation and drag
  close-change comparison. Its right axis defaults to P/E, with inventory days,
  operating margin and None available. One metric at a time keeps two Y axes, with
  the right axis, line and readout in one matching color. The metric preference is
  stored as `market-price-comparison:v1` and survives reloads and instrument changes.
- Taiwan P/E comes from TWSE BWIBBU_d and TPEx peQryDate (official daily historical
  P/E, not a current snapshot). Missing, zero, negative and nonfinite values are gaps.
  Overseas P/E can be calculated only when four consecutive reported quarters of EPS
  in the price currency have known filing dates; otherwise it is unavailable.
- Financial ratios carry forward only from a publication date. If unavailable, the
  display explicitly marks an estimated alignment: Taiwan quarterly filing deadlines,
  or 120 days after quarter end overseas. These are trend comparisons, not historical
  point-in-time backtests. Readouts preserve the fiscal quarter and estimated status.
- History API reads now allow up to 1830 days and portfolio history reads 1830 saved
  daily snapshots. **Available history is bounded by stored source data**: these controls
  do not initiate a five-year exchange backfill. The existing scheduled collector adds
  Taiwan daily P/E alongside its existing sources. Deploy frontend and maya-sawa together.
- A missing metric is explained on the chart; it never flattens price into a false line
  or substitutes a different market's instrument.

Validation: `vitest run tests/market tests/format`; `poetry run python -m pytest
tests/test_market_valuation.py tests/test_market_history_range.py
tests/test_market_history_collector.py tests/test_taiwan_portfolio_history.py -q`.
UI inspection used explicitly labeled test data because the local backend was offline.
Production collection and full five-year data availability have not been verified here.
