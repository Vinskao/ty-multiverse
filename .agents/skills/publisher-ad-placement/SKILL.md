---
name: publisher-ad-placement
description: 調整 TY Multiverse 的廣告放置位置、分頁範圍與裝置版面，或排查 Monetag 版位不見、擋住操作和同意後沒有投放。
---

# TY Multiverse 廣告放置

1. 先從 `src/components/Nav.astro` 和 `src/scripts/navigation/menu.ts` 確認主分頁，再檢查共用的 `src/layouts/BaseLayout.astro`。現行範圍是首頁及主選單公開分頁，排除 Palais 及其子頁。登入與文章管理頁不放廣告。
2. 沿用 `MonetagInPagePush.astro` 與既有版位。每頁放一個掛載點。由 `consentAds.ts` 在同意後載入供應商腳本，切頁前清理，撤回同意時卸載。
3. 優先確認廣告沒有遮住底部控制列、圖表操作、Cookie 面板或行動版導覽。供應商注入的 Monetag iframe 由 `monetagPosition.ts` 移入頁內版位並設為 `position: relative`，讓它隨頁面捲動。判斷條件是 `position: fixed` 加最高 z-index、高度 ≤ 300px 的 iframe 或 body 直屬 div，不限 190px（2026-11-17 手機出現兩則 60px 橫幅蓋住導覽列）。用實際廣告或測試節點檢查窄螢幕與桌面，並確認關閉按鈕可操作。
4. 先跑 `node node_modules/vitest/vitest.mjs run tests/ads tests/cookies`。瀏覽器檢查直接開頁、同意前後、往返 Palais、撤回同意及每頁腳本數量。上線後先查正式 HTML 的版位，再查同意後腳本請求與實際廣告。若版位存在且腳本成功但沒有廣告，查 Monetag 後台版位狀態、投放及瀏覽器攔截。
