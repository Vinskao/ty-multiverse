# ETF Research 顯示分支

一般 ETF 的 Research 只顯示持股、產業、地區或資產配置比例及必要的來源／日期。沒有個股三軸、買賣偏向、供應鏈或技術圖。ETF 身分用已核實的研究 `kind: "etf"`，不靠股票代碼字首；既有 dashboard 的 stock 類型可以繼續使用。

只有具明確產業主題（如電動車）的 ETF，才在配置外加 `theme` 與 `themeResearch`。兩者必須同時提供。持有 Tesla 或大型權值／高股息分類本身不會自動啟用主題研究。

009811 已改成 allocation-only seed。可讀來源為 [MoneyDJ 配置頁](https://www.moneydj.com/etf/x/basic/basic0007.xdjhtm?etfid=009811.tw)，本次讀到持股／衍生品日期 2026-10-14、地區日期 2026-08-31；發行人網站本次無法讀取，產業比例尚未取得。這是有日期的次級來源快照，不是最新完整配置。來源原值裁切成前後端 fixture，未推估分類、補足其他或把差額稱為現金。期貨獨立揭露，沒有和股票相加；分母未註明時也明寫。

每個 allocation group 都要有 dimension、asOf、coverage、denominator、sourceLabel、HTTPS sourceUrl 與 items。partial 不正規化；unavailable 必須空 items，可用 null 日期。有效數字保留 0、負權重與大於 100% 的曝險，因為衍生品與槓桿不一定落在 0–100%；不替來源改口徑。重複項目、錯誤日期、字串／空值／非有限比重均拒絕。每張表來源獨立，禁止跨日期拼成同一投資組合。

以可存取的表格列出精確百分比，不新增圖表；桌面、觸控與鍵盤讀者皆不依賴 hover。來源文字透過 textContent 寫入。研究渲染從 index.ts 抽出至 researchContent.ts，保留個股的原有評分、來源與兩張圖，並用 characterization 測試固定。

研究品質指引、公開 AI writing guide 與頁面複製 prompt 均加入 ETF 優先分支。後端支援同一版本化儲存 API；既有 seed 更新保護人工編輯規則不變。

驗證命令：

```text
poetry run python -m pytest tests/test_research_etf.py tests/test_research_review_20261025.py tests/test_market_research.py -q
<bundled-node> node_modules/vitest/vitest.mjs run tests/market tests/components tests/format/rawFormatting.test.ts
```

先重現舊 schema 拒絕 allocation-only ETF，再實作至綠；既有個股內容測試保留，一般 ETF 改驗證新的明確契約。本次前端 184 項、後端 31 項通過；抽出的研究模組 TypeScript 檢查通過。以 Chrome 實際載入渲染模組與真實來源 fixture，檢查 380px／720px 容器，三張表皆無橫向內容溢出；這是元件預覽，未宣稱正式站已部署。正式建置交 Jenkins。
