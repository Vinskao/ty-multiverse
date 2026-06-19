# TY Multiverse Development Guidelines (AGENTS.md)

## 1. Internationalization (i18n) / 多國語系

### Source of Truth / 單一來源
- **`window.AppLang`**: Defined in `public/scripts/lang.js`. Use this for all language state management.
- **Methods**: `get()`, `set(code)`, `onChange(callback)`, `getQALang()`.
- **Sync**: Always use `AppLang` to keep the QABot and UI in sync.

### Storage / 字串存放
- **`src/storages/i18n.json`**
  - **Structure**: `section.key.en` and `section.key.zh`
  - **Example**: `"home": { "heroTitle": { "en": "...", "zh": "..." } }`
  - **Placeholders**: Supports `{count}` via `data-i18n-count`

### Implementation Strategies / 實作策略
- **Client-side (Home/Work)**
  - Use `data-i18n="section.key"` attributes
  - `Nav.astro` contains the global script that translates these elements on `astro:page-load` and `AppLang.onChange`
- **Server-side / SSR (About)**
  - Reads `?lang=` search parameter
  - **Reload Rule**: `about.astro` must trigger a full `window.location.href` reload on language change so the server can re-render
- **Cleanup**
  - In module scripts, always keep the `onChange` cleanup function to avoid listener accumulation during View Transitions navigation
  ```javascript
  let _langCleanup = null;
  function init() {
    if (_langCleanup) _langCleanup();
    _langCleanup = AppLang.onChange(...);
  }
  ```

---

## 2. Theme & View Transitions / 主題與轉場

### Theme Persistence / 主題持久化
- **`astro:after-swap`**: In `BaseLayout.astro`, restore the `theme-dark` or `theme-light` class on `<html>` after DOM swap but before React hydration
- **FOUC Prevention**: Use an `is:inline` script in `<head>` for initial theme application

### Script Execution / 腳本執行
- **`is:inline`**: Runs on every navigation. Use for critical initialization such as `lang.js`
- **Module scripts**: Run once per session. Use `astro:page-load` to re-initialize UI logic

### Astro Island Hydration Trap / Astro Island Hydration 陷阱
- **Never place client islands inside `<noscript>`**
  - Do not put components like `<ThemeToggle client:load />` inside fallback-only `<noscript>` markup
  - In this repo, Astro may emit the island hydration runtime into that same `<noscript>` block
  - Browsers do not execute scripts in `<noscript>` during normal JS-enabled rendering, so island hydration can fail globally
- **Real failure seen in this project**
  - `SkillsBubbleChart.tsx` server-rendered the title and empty `<svg>`, but React never hydrated
  - Because hydration never started, D3 `useEffect()` did not run, so no bubbles or treemap content appeared
  - The bug looked like a D3 rendering problem, but the root cause was upstream Astro runtime placement in `Nav.astro`
- **Concrete repo example**
  - Problematic pattern was previously in `src/components/Nav.astro`
  - `ThemeToggle client:load` inside the noscript footer caused Astro hydration runtime code such as `Astro.load` and `customElements.define('astro-island', ...)` to land inside `<noscript>`
  - Fix: keep noscript content static-only, and render interactive client islands only in the normal DOM path
- **Symptoms to watch for**
  - SSR HTML is visible, but interactive island behavior never starts
  - `customElements.get('astro-island')` returns `undefined`
  - `typeof self.Astro` returns `undefined`
  - Island elements keep their `ssr` attribute after load
  - D3 or React components show shell markup only, with no client-rendered nodes
- **Debug checklist**
  1. Inspect raw page HTML, not only the post-hydration browser DOM
  2. Check whether Astro runtime snippets were emitted inside a `<noscript>` block
  3. Confirm whether the island root still has `ssr` after load
  4. If a D3 component looks empty, verify hydration before changing D3 logic
  5. Re-test with `npm run build` and a real browser load after the fix

---

## 3. UI Layout & Components / 版面與元件

### Navbar / 導覽列
- **Controls Placement**: Place the language toggle and theme toggle inside `.menu-footer` to avoid overlapping with social icons
- **Hero Component**: Supports `title` and `tagline` slots. Wrap translatable text in elements with `data-i18n`

### CSS Tokens
- Use standard CSS variables defined in `src/styles/global.css`
- Support both `.theme-light` and `.theme-dark`

---

## 4. Development Workflow / 開發流程
1. Update `i18n.json` with new strings
2. Apply `data-i18n` attributes to HTML elements
3. If the component is dynamic, use the `getI18n` helper pattern to update text in scripts
4. Verify persistence across page navigations

### Build Environment / 建置環境
- This frontend requires Node.js `>= 22.12.0` for `astro build`.
- The local shell may still default to Node 20, so use the bundled workspace Node when building or testing if the runtime check fails.
- If you see `Node.js v20.x is not supported by Astro!`, rerun with the bundled executable from the workspace dependencies instead of changing app code.

---

## 5. Astro CSS Loading / Astro CSS 載入規則

### SSR CSS Rule / SSR 模式現象
- **Current project context**: `astro.config.ts` uses `output: 'server'`, `base: '/tymultiverse'`, and `ClientRouter` view transitions
- **Observed behavior in this repo**: under Astro v5 SSR dev mode, CSS imported only inside sub-components or page scripts, and even scoped inline `<style>` blocks inside sub-components, may not be collected into the server-rendered `<head>` on hard reload
- **Symptom**: HTML renders, but the page looks unstyled or partially styled. Some styles may appear only after HMR, while hard reload loses them

### Current Global Fix / 目前全域方案
- **Single source of stylesheet loading**: `src/layouts/BaseLayout.astro` is the root stylesheet manifest for this project
- **Preferred strategy**: import external files from `src/styles/*.css` in `BaseLayout.astro` via `?url`, then emit explicit `<link rel="stylesheet">` tags there
- **Why this is preferred**
  - works in Astro v5 SSR dev mode
  - survives hard reload
  - avoids page-by-page drift
  - avoids relying on sub-component CSS collection

### Rules / 使用規則
- Do not rely on `import '../styles/foo.css';` inside components for critical page styling
- Do not rely on scoped inline `<style>` blocks inside sub-components for critical page styling under the current SSR setup
- Do not spread page-level `?url` stylesheet links everywhere unless a page truly needs an isolated one-off stylesheet
- When adding a new external stylesheet, register it in `BaseLayout.astro` first
- `BaseLayout.astro` still keeps `<slot name="head" />` for real one-off head entries, but stylesheet loading should default to the layout manifest

### Component Style Extraction Rules / 元件樣式抽離規範
- If a reusable Astro component needs non-trivial styling, prefer extracting its `<style>` block into `src/styles/<component-name>.css`
- Register the extracted stylesheet in `BaseLayout.astro` instead of depending on Astro scoped-style collection
- When moving scoped styles into global CSS, add a stable component root class if selectors are too generic
  - Good examples:
    - `class="portfolio-preview card"`
    - `class="contact-cta"` on `<aside>`
    - `class="call-to-action"` on `<a>`
- Prefer tightening selectors over adding extra wrapper elements unless structure truly requires a wrapper
- Avoid bare selectors like `.title`, `.group`, `.start`, `a`, `h2`, or `img` in extracted global component CSS
  - Prefer component-scoped selectors such as:
    - `.hero .title`
    - `footer .group`
    - `.portfolio-preview img`
    - `.contact-cta h2`
    - `.call-to-action`
- When converting from Astro scoped CSS to global CSS, keep behavior identical first and only refine behavior after verification
- After extraction, remove the original inline `<style>` block so the project keeps one styling source of truth

### Do Not Use / 避免做法
- Do not use raw dev-only paths like:
  - `href="/src/styles/dance.css"`
  - `href="/src/styles/party.css"`
- Do not assume CSS imported in `MainHead.astro`, `Nav.astro`, `Fight.astro`, `Levellist.astro`, `Galwall.astro`, `Briefing.astro`, `PeopleGallery.astro`, or other sub-components will always be present in SSR HTML
- Do not assume scoped inline `<style>` blocks in sub-components such as `Footer.astro`, `Hero.astro`, `Grid.astro`, `PortfolioPreview.astro`, `ContactCTA.astro`, `Pill.astro`, or `CallToAction.astro` will always be present in SSR HTML
- Do not mix these patterns on the same feature without a reason:
  - component `import '../styles/foo.css'`
  - page-level `?url` links
  - layout-level manifest links

### Current Baseline / 目前已掛載的外部樣式
- `global.css`
- `base-layout.css`
- `theme-toggle.css`
- `nav.css`
- `footer.css`
- `hero.css`
- `grid.css`
- `portfolio-preview.css`
- `contact-cta.css`
- `pill.css`
- `call-to-action.css`
- `index.css`
- `about.css`
- `briefing.css`
- `control.css`
- `dance.css`
- `fight.css`
- `galwall.css`
- `group.css`
- `levellist.css`
- `palais.css`
- `party.css`
- `people-gallery.css`
- `people-management.css`
- `qabot.css`
- `qaplatform.css`
- `qabotv2.css`
- `table-ajax.css`

### Current Extracted Components / 目前已抽離的元件樣式
- `Footer.astro` -> `footer.css`
- `Hero.astro` -> `hero.css`
- `Grid.astro` -> `grid.css`
- `PortfolioPreview.astro` -> `portfolio-preview.css`
- `ContactCTA.astro` -> `contact-cta.css`
- `Pill.astro` -> `pill.css`
- `CallToAction.astro` -> `call-to-action.css`

### Debug Checklist / 排查清單
1. Inspect actual server HTML, not just the browser DOM after HMR
2. Check whether `<head>` contains the expected `<link rel="stylesheet">` tags
3. If a page is unstyled, identify:
   - a stylesheet missing from the `BaseLayout` manifest
   - inline component styles being overridden unexpectedly
   - a newly added external stylesheet that was never registered in the layout
   - a selector that became too generic after extracting scoped component CSS
4. Verify with hard reload (`Ctrl+Shift+R`) and `npm run build`

### Migration Note / 遷移備註
- Earlier fixes used page-level `<Fragment slot="head">` links as an intermediate workaround
- The current preferred solution is broader: keep stylesheet registration centralized in `BaseLayout.astro`, and remove redundant external CSS imports from pages/components when touching related files

---

## 6. Mac Disk Space Maintenance / 磁碟空間維護

### Home Directory Git Repo (`~/.git`) — 已刪除
- `/Users/vinskao` 本身是一個意外的 git repo（14 commits, 無 remote），追蹤 3325 個 `001-project/EC/` 檔案
- **2026-05-15 完全清理**：
  1. 刪除 37 個 `tmp_pack_*` 暫存檔案（釋放約 215 GB）
  2. 刪除整個 `~/.git` 目錄（釋放額外 35 GB）
  3. **總計釋放約 250 GB**
- **指令參考**（如果再遇到）：
  ```bash
  # 確認情況
  du -sh ~/.git/
  git -C ~/ log --oneline | wc -l
  
  # 清理暫存檔
  rm ~/.git/objects/pack/tmp_pack_*
  
  # 完全刪除
  rm /path/to/gc.log 2>/dev/null
  rmdir ~/.git
  ```

### 其他可定期清理的目標
| 路徑 | 說明 |
|---|---|
| `EC/BFF_Extention/logs/` | log 檔，可視需要清除 |
| `EC/UI_Workspace_lite_v20260407/node_modules/` | 可 `npm install` 重裝 |
| `EC/UI_Workspace_lite_v20260407/dist/` | build 產出，可重 build |

---

## 7. 503 Service Availability Flag / 服務不可用標記

### 用途
當任何 API 回傳 503 時，自動隱藏對應 UI 區塊，並每 24 小時 ping 一次嘗試自動恢復。Flag 持久化至 localStorage，頁面重整後仍有效。

### 模組位置
- Manager: `src/services/core/serviceAvailabilityManager.ts`
- Keys 常數: `src/common/constants/serviceKeys.ts`

### 服務 Key 對應

| Key | 使用服務 | Health Endpoint |
|-----|---------|-----------------|
| `backend` | damageService, galleryService, peopleService, weaponService | `{BACKEND_URL}/actuator/health` |
| `gateway` | auth.ts（admin/user/keycloak） | `{GATEWAY_URL}/tymg/actuator/health` |
| `maya-sawa` | auth.ts（voyeur）, qaService | `{MAYA_SAWA_URL}/health` |
| `leetcode-stats` | index.ts `fetchLeetCodeStats()` | `{API_BASE_URL}/maya-sawa/proxy/leetcode-stats/Vinskao` |

### 接入新服務（三步驟）

1. **透過 `apiService`（推薦）**：在 `apiRequest()`/`makeRequest()` 的 options 中加入 `serviceKey: SERVICE_KEYS.XXX`，503 會自動被攔截
2. **UI 層**：呼叫 `serviceAvailabilityManager.onChange(key, visible => { element.style.display = visible ? '' : 'none'; })`，並保存回傳的 cleanup 函式
3. **頁面載入**：呼叫 `serviceAvailabilityManager.checkRecovery(key)` 嘗試自動恢復（24h 節流）

```typescript
// 範例：接入新服務
import { serviceAvailabilityManager } from '../services/core/serviceAvailabilityManager';
import { SERVICE_KEYS } from '../common/constants/serviceKeys';

## 8. 這次排查的經驗

### Astro base path API 路徑
- 專案 base 是 `/tymultiverse`，所以在 client-side `fetch()` 裡不能直接寫 `/api/...`，否則瀏覽器會打到站台根路徑 `/api/...`。
- 這次 `Account Portfolio` 一直顯示舊資料，是因為前端打到 `https://peoplesystem.tatdvsonorth.com/api/market/portfolio`，實際回 `404`，然後 UI 走 localStorage fallback。
- 之後只要是在 client script 內打本站自己的 Astro API，請優先用：
  - `import.meta.env.BASE_URL`
  - 或集中成一個像 `astroApiPath()` 的 helper

### 快取與部署
- Astro build 產出的 client bundle 檔名帶 hash，且靜態資源通常是 `cache-control: immutable`。
- 若修正只改到 bundle，但 HTML 還指向舊檔名，Chrome 可能長時間沿用舊 JS。
- 驗證頁面時，除了看 API `200`，也要確認：
  - HTML 指到的新 bundle 檔名
  - 瀏覽器實際載入的 JS 是否已包含新路徑
  - localStorage 是否還殘留舊的 `market:portfolio`

### Portfolio fallback
- `fetchPortfolio()` 失敗時會退回 localStorage，這是設計如此，不是一定代表 API 還沒修好。
- 若畫面顯示 `Offline` 但 API 已正常，請先懷疑：
  - client bundle 還是舊版
  - 路徑 base 沒帶對
  - 或瀏覽器快取 / localStorage 還沒被新資料覆蓋

// Step 1（service 層）
await apiService.request({ url, serviceKey: SERVICE_KEYS.BACKEND });

// Step 2 & 3（UI 層）
serviceAvailabilityManager.register(SERVICE_KEYS.BACKEND, `${backendUrl}/actuator/health`);
const el = document.querySelector('.my-section') as HTMLElement;
let cleanup: (() => void) | null = null;
if (serviceAvailabilityManager.isBlocked(SERVICE_KEYS.BACKEND)) {
  el.style.display = 'none';
  serviceAvailabilityManager.checkRecovery(SERVICE_KEYS.BACKEND);
}
if (cleanup) cleanup();
cleanup = serviceAvailabilityManager.onChange(SERVICE_KEYS.BACKEND, v => { el.style.display = v ? '' : 'none'; });
```

### 注意事項
- `syncService.ts` 呼叫 local Astro API route，不接入 503 管理
- `characterService.ts` 委派給 `peopleService`，無需重複登記
- Recovery 節流：同一 key 24h 內只 ping 一次
- localStorage key 格式：`svc_block_{serviceKey}`
- `onChange()` 回傳 cleanup 函式，View Transitions 環境下必須在重新初始化前呼叫清除，防止監聽器累積（參考 `§1 i18n` 的 `_langCleanup` 模式）

---

## 本地啟動

Node.js 版本要求 >= 22.12.0（`astro@6`）：

```bash
nvm use        # 或 nvm install 22.12.0 && nvm use 22.12.0
npm install
npm run dev
```

## Docker 建置

```bash
# 建置
docker build --no-cache -t papakao/ty-multiverse-frontend .
docker run -p 4321:4321 ty-multiverse-frontend

# ARM64 多平台
docker build --build-arg PLATFORM=linux/arm64 -t papakao/ty-multiverse-frontend .
docker push papakao/ty-multiverse-frontend:latest
```

## Article Sync API 測試

```bash
# 檢查文件狀態（GET）
curl -X GET "http://localhost:4321/tymultiverse/md-exporter"
curl -X GET "https://peoplesystem.tatdvsonorth.com/tymultiverse/md-exporter"

# 執行同步（POST）
curl -X POST "http://localhost:4321/tymultiverse/md-exporter" \
  -H "Content-Type: application/json" -d '{"action": "sync"}'
curl -X POST "https://peoplesystem.tatdvsonorth.com/tymultiverse/md-exporter" \
  -H "Content-Type: application/json" -d '{"action": "sync"}'
```

Windows PowerShell：
```powershell
Invoke-RestMethod -Uri "http://localhost:4321/tymultiverse/md-exporter" -Method GET | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:4321/tymultiverse/md-exporter" -Method POST -ContentType "application/json" -Body '{"action": "sync"}' | ConvertTo-Json -Depth 10
```

## Kubernetes CronJob（文章同步）

```bash
# 查看 CronJob 狀態
kubectl get cronjobs -n default

# 手動觸發
kubectl create job --from=cronjob/ty-multiverse-article-sync manual-sync-$(date +%s) -n default

# 查看日誌
kubectl logs job/manual-sync-$(date +%s) -n default
kubectl get jobs -n default | grep ty-multiverse-article-sync
```

## Market Overview 503 排查指令

```bash
# 確認 secret 不是空的（應為 48 bytes）
kubectl describe secret market-internal-secret

# 從 maya-sawa pod 測試 internal 端點
kubectl exec <maya-pod> -- python3 -c 'import os,urllib.request; \
  r=urllib.request.urlopen(urllib.request.Request("http://localhost:8000/maya-sawa/market/internal/usage", \
  headers={"X-Internal-Secret":os.getenv("MARKET_INTERNAL_SECRET","")})); print(r.status, r.read()[:200])'

# 從前端 pod 確認 server route
kubectl exec <frontend-pod> -- node -e 'fetch("http://localhost:4321/api/market/usage").then(r=>r.text()).then(console.log)'
```

**重點教訓**：前端 server route 機密一律用 `process.env`，不要用 `import.meta.env`（build 階段會被 inline 成 undefined）。叢集內呼叫服務務必對齊 Service 實際 port（maya-sawa service port 80，非 8000）。

## Video Service 本地開發

```bash
# 安裝 FFmpeg
# Windows: choco install ffmpeg
# macOS: brew install ffmpeg
# Linux: sudo apt install ffmpeg

npm install
npm run video-service          # 或 npm run video-service:dev（nodemon 模式）
```

測試：
```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/videos/merge \
  -H "Content-Type: application/json" \
  -d '{"videoUrls":["http://..."],"outputFormat":"webm","removeBackground":true}'
```

## Vite 7 / Astro 6 相容性問題

若 dev server 出現 `TypeError: Cannot read properties of undefined (reading 'call')`：

```bash
npm install astro@^6.4.7 @astrojs/react@^5.0.7 @astrojs/mdx@latest
```

---

## Security Hardening: Token URL Removal (2026-06-19)

### #4 Remove JWT/Token from URL Query Parameters (P1–P3 Completed)

**問題**：access/refresh token 原透過 URL query param 在整站導覽傳遞
- Nav.astro、palais、~15 SSR 頁把 token 掛在連結（`?username=...&token=...&refresh_token=...`）
- 導致 token 殘留在瀏覽器歷史、伺服器日誌、Referer header
- Gateway 回呼也把 token 串進 302 redirect URL、甚至 log 出明文

**修正** (P1–P3 已完成、前端 build 通過)：

1. **P1 移除導覽接力** ([Nav.astro](src/components/Nav.astro), [NavScript.ts](src/scripts/NavScript.ts))
   - Nav.astro 連結：移除 `&token=...&refresh_token=...`，只留 `?username=...`（非機密）
   - NavScript.ts updateNavLinks()：工作/控制/Wildland/Palais 連結不再帶 token
   - `username` 保留（非機密、用於 SSR 判斷登入狀態）

2. **P2 落地洗網址** (NavScript.ts getUrlParams)
   - URL token 捕獲並存進 localStorage 後，立刻 `history.replaceState` 洗掉 query param 中的 token/refresh_token/id_token
   - 避免留在瀏覽器歷史與後續請求的 Referer

3. **P3 SSR gate 改讀 storage** (~15 pages + components)
   - [people-management.astro](src/pages/people-management.astro), [control.astro](src/pages/control.astro), palais/* 等：改 `isLoggedIn = !!username` （從原本 `!!username && !!token`）
   - [CKEditor.astro](src/components/CKEditor.astro), [Briefing.astro](src/components/Briefing.astro)：不再從 URL 讀 token，改讀 localStorage
   - [index.ts](src/scripts/index.ts) marketAuthHeaders()：只從 localStorage 取 token（不再 fallback URL）

**部署注意**：
- 前端 build 通過（`npx astro build`），型別檢查無誤
- 瀏覽器 admin 寫入仍正常（localStorage 內有 JWT）
- 測試流程：登入後確認 URL 只有 username 無 token；refresh_token 不再進任何 URL

**P4b 待做**（已排獨立 task）：refresh_token/id_token 改 httpOnly cookie（涉 Gateway/auth.ts 改動，需可實測的 token 過期場景）。

版本要求：`astro` >= 6.4.7、`@astrojs/react` >= 5.0.7、`vite` >= 7.3.5。
