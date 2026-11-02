import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, '../../src/styles/index.css'), 'utf8')

// Regression 2026-11-02: the home "Stocks" card overflowed its border at ~900-1100px wide.
// .market-watchlist is `display:grid` with no column template, so its implicit auto column grew
// to the min-content of the nowrap filter chips / wide table and pushed every row past the card.
describe('market watchlist grid', () => {
  it('constrains its single column so wide children cannot stretch it', () => {
    const rules = [...css.matchAll(/(^|\n)\s*\.market-watchlist\s*\{([^}]*)\}/g)].map((m) => m[2])
    expect(rules.some((body) => /grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)/.test(body))).toBe(true)
  })
})
