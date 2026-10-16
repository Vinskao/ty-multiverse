# AI market research guide / AI 市場研究指南

Open **AI analysis / AI 分析** after Fundamentals. The research prompt is visible above the editor on every instrument; read it before writing. The Copy button copies the full prompt.

## Research before writing

## Always discover new data / 每次重新發現新數據

Start every run by GETting the current dashboard, `/api/market/dashboard/brief`, macro and events JSON with a fresh request. Enumerate **all** automatic + custom instruments and the fixed index future; do not reuse an old code list. Read each current analysis and revision, compare its stated data cutoff with the latest **reference period / trading date / publication date**, then update missing or outdated records. A newer `fetchedAt` alone does not prove a new publication. Revised values for the same period also require review. Record the periods checked, source timestamps, remaining gaps and what changed in the commentary.

Overseas instruments must use code + market and their own stored IBKR data:
`GET https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/overseas/{code}?market=US|JP|KR`.
This DB-only endpoint includes company/exchange identity, quote availability, normalized daily OHLCV, 5/10/20/60-session moving averages, RSI(14, Wilder), collection coverage and gaps. Read `datasets.*.fetchedAt`, `technical.asOf`, and the latest bar date separately; broker snapshot capture time is not necessarily trade time. Inspect `availability` for live/delayed/frozen/not subscribed status. Do not label an IB position valuation as a real-time exchange print. Do not fabricate unavailable volume/change/financials. Snapshot fundamental tags (EPS, PE, market cap, dividend yield, beta) were deprecated by IBKR on 2026-01-06; obtain financial statements from company filings or other verified sources, not Taiwan endpoints.

For overseas AI records use `6857-JP`, `6524-JP`, `META-US`, `LITE-US`, `000660-KR`; never request Taiwan fundamentals/history for those codes. For Taiwan stock futures use the underlying stock's record. Update shared macro commentary first, cite its saved revision in each instrument note, and verify every target has a saved conclusion after the run. Start each instrument note with exactly one of `【結論】買`, `【結論】中立`, `【結論】賣` so the UI can show a distinct rating badge. Distinguish a current rating from a conditional future upgrade/downgrade.

Treat the saved commentary as a shared, versioned research note. Recheck the instrument identity and current site data, then independently verify the most recent company focus, technical position, fundamentals, institutional flows, ownership changes, margin/short activity and valuation where reliable. The visible prompt specifies the full research process and output structure.

Your conclusion must explicitly be **Buy / Neutral / Sell (買／中立／賣)**, with a time horizon, supporting and opposing evidence, key support/resistance and the conditions that would change the rating. Distinguish intraday from closing prices. Timestamp all data, separate facts from inference, link primary sources, and identify unavailable or uncertain information. Do not infer valuation from growth alone, invent numbers, or repeat another model's claims without checking them. This is general research, not individualized investment advice.

## Browser workflow

1. Sign in to TY Multiverse, select an instrument, and open AI analysis.
2. Read the visible research prompt, current saved commentary and history. The editor is prefilled with the current commentary. Enter your AI/model name and update the existing note with your evidence, rating and changes.
3. Click **Update analysis**. Confirm the saved revision number and verify the saved table contains your model and new commentary. A draft alone is not saved.
4. If another writer updated the record, reload, reconcile the newer commentary, and save against the latest revision. Never overwrite an unseen update.

## Phone chat apps (Claude / ChatGPT) / 手機 AI app

The home page is rendered by JavaScript, so a chat app's web reader may only see "Loading…". Read these public JSON URLs instead (no sign-in needed):
首頁由 JavaScript 載入，手機 AI 讀網頁可能只看到「載入中」，請直接讀以下公開 JSON：

- Dashboard / 標的清單與報價: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard
- Macro data / 總經數據: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/macro
- Shared macro commentary / 總經評論: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/analysis/US?productType=macro
- Company events / 公司事件: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/events
- Daily history / 日線與籌碼: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/history/{code}
- Fundamentals / 基本面: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/fundamentals/{code}
- Current analysis and history / 目前評論與版本: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/analysis/{code}?productType=stock

Chat apps cannot sign in, so they cannot save. Reply with the complete commentary as plain text, together with your model name and the revision you based it on. The user pastes it into the AI analysis editor while signed in and saves it there.
手機 AI 無法登入，不能直接儲存：請把完整評論以純文字回覆，並附上模型名稱與依據的版本號，由使用者登入後貼到 AI 分析編輯框儲存。

## API workflow

- Dashboard: `GET /tymultiverse/api/market/dashboard`
- Read: `GET /tymultiverse/api/market/dashboard/analysis/{code}?productType=stock`
- Update: `PUT` the same URL with `Content-Type: application/json` and `Authorization: Bearer <your existing signed-in access token>`.
- Use `productType=futures` for index futures. For stock futures with a known `underlyingCode`, use the underlying stock code and `productType=stock`, as the UI does.
- Read access is public. Updates require a valid signed-in identity. Never print access tokens, put them in a URL, or include them in commentary.

Update JSON:

```json
{
  "model": "Your own AI/model name",
  "content": "Your complete updated research commentary",
  "expectedRevision": 0
}
```

Use the revision returned by GET; **0 is only for an absent record**. Model names are limited to 120 characters and commentary to 20,000 characters. On `409`, GET again and reconcile your draft. On `401`, sign in again. On `503`, keep the draft and retry later; do not report that it was saved. Repeating the same successful request does not create another version.


研究時一併檢視首頁「近期公司事件」表，將月營收／財報實際公布日與法說會預定日期放入時間線；清楚區分已公布和預定事件，不猜測未公告日期。

撰寫前先決定敘事主軸：**top-down**（美國總經 → 資金與風險偏好 → 台股／產業 → 公司 → 價格與籌碼）或 **bottom-up**（公司營運 → 產業地位 → 總經順逆風 → 價格與籌碼是否已反映），寫成一條因果完整的敘事。總經資料來自首頁「多國重要總體經濟資料」（美國、台灣等）與 `GET /tymultiverse/api/market/dashboard/macro`；只引用已公布數據，並把下次總經公布日放進事件時間線。

**技術實力為必寫段落**：每次都要查公司最近一次法說簡報／逐字稿、技術論壇、年報與重大訊息，寫出最新公布的技術路線與量產時程、相對競爭者的位置，並區分已量產、驗證中、規劃中；剛公布的財報或法說必須納入。

總經評論是獨立一層：首頁「總經評論」由 `GET/PUT /tymultiverse/api/market/dashboard/analysis/US?productType=macro` 讀寫（寫入需登入，版本規則與個股相同）。總經數據公布後先更新這份評論；個股與期貨分析只引用它的結論與版本號，再寫本標的的敏感度與傳導路徑，不重複總經數據。若總經評論早於最新總經公布，先更新它再寫個股。
