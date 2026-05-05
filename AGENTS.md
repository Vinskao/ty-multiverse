# TY Multiverse Development Guidelines (AGENTS.md)

## 1. Internationalization (i18n) / 多國語言系統

### Source of Truth / 狀態來源
- **`window.AppLang`**: Defined in `public/scripts/lang.js`. Use this for all language state management.
- **Methods**: `get()`, `set(code)`, `onChange(callback)`, `getQALang()`.
- **Sync**: Always use `AppLang` to ensure the QABot and UI stay in sync.

### Storage / 文字存儲
- **`src/storages/i18n.json`**:
  - **Structure**: `section.key.en` and `section.key.zh`.
  - **Example**: `"home": { "heroTitle": { "en": "...", "zh": "..." } }`.
  - **Placeholders**: Supports `{count}` via `data-i18n-count` attribute.

### Implementation Strategies / 實作策略
- **Client-side (Home/Work)**: 
  - Use `data-i18n="section.key"` attributes.
  - `Nav.astro` contains a global script that automatically translates these elements on `astro:page-load` and `AppLang.onChange`.
- **Server-side / SSR (About)**:
  - Reads `?lang=` search parameter.
  - **Reload Rule**: `about.astro` must trigger a full `window.location.href` reload on language change to allow the server to re-render.
- **Cleanup**: In module scripts, always store the `onChange` cleanup function to prevent listener accumulation during View Transitions navigation.
  ```javascript
  let _langCleanup = null;
  function init() {
    if (_langCleanup) _langCleanup();
    _langCleanup = AppLang.onChange(...);
  }
  ```

---

## 2. Theme & View Transitions / 主題與視圖轉場

### Theme Persistence / 主題持久化
- **`astro:after-swap`**: In `BaseLayout.astro`, we use this event to restore the `theme-dark` or `theme-light` class to the `<html>` element **after** the DOM swap but **before** React hydration. This prevents the theme from resetting to light mode during navigation.
- **FOUC Prevention**: An `is:inline` script in the `<head>` handles the initial theme application.

### Script Execution / 腳本執行
- **`is:inline`**: Runs on every navigation. Use for critical initialization (like `lang.js`).
- **Module Scripts**: Run once per session. Use `astro:page-load` to re-initialize UI logic.

---

## 3. UI Layout & Components / UI 佈局與組件

### Navbar / 導航欄
- **Controls Placement**: The language toggle and theme toggle are placed inside `.menu-footer` (the right column on desktop, footer of hamburger menu on mobile) to avoid overlapping with social icons.
- **Hero Component**: Supports `title` and `tagline` slots. Use these to wrap text in `div`s with `data-i18n` attributes.

### CSS Tokens
- Use standard CSS variables defined in `src/styles/global.css`.
- Support both `.theme-light` and `.theme-dark` variants.

---

## 4. Development Workflow / 開發流程
1. Update `i18n.json` with new strings.
2. Apply `data-i18n` attributes to HTML elements.
3. If the component is dynamic (like the Work page sync button), use the `getI18n` helper pattern to update text via script.
4. Verify persistence across page navigations.

---

## 5. Astro CSS Loading / Astro CSS 載入規則

### SSR CSS Rule / SSR 樣式規則
- **Current project context**: `astro.config.ts` uses `output: 'server'`, `base: '/tymultiverse'`, and `ClientRouter` view transitions.
- **Observed behavior in this repo**: under Astro v5 SSR dev mode, CSS imported only inside sub-components or page scripts may not be collected into the server-rendered `<head>` on hard reload.
- **Symptom**: HTML renders, but the page looks unstyled or partially styled. Navbar/global styles may appear only after HMR, while page-specific styles are missing.

### Required Pattern / 必要做法
- **Global shared CSS**: link it directly in `src/layouts/BaseLayout.astro` using `?url`.
  - Current shared set:
    - `global.css`
    - `theme-toggle.css`
    - `nav.css`
    - `qabot.css`
    - `qaplatform.css`
    - `qabotv2.css`
- **Page-specific CSS**: do **not** rely only on `import '../styles/foo.css';`
  - Instead use:
  ```astro
  ---
  import pageCssUrl from "../styles/page.css?url";
  ---
  <BaseLayout>
    <Fragment slot="head">
      <link rel="stylesheet" href={pageCssUrl} />
    </Fragment>
  </BaseLayout>
  ```
- **Layout support**: `BaseLayout.astro` provides `<slot name="head" />` inside `<head>` for page-level stylesheet injection.

### Do Not Use / 避免做法
- Do not use raw dev-only paths like:
  - `href="/src/styles/dance.css"`
  - `href="/src/styles/party.css"`
- Do not assume CSS imported in `MainHead.astro`, `Nav.astro`, `Fight.astro`, `Levellist.astro`, `Galwall.astro`, or other sub-components will always be present in SSR HTML.

### Debug Checklist / 排查清單
1. Inspect actual server HTML, not just the browser DOM after HMR.
2. Check whether `<head>` contains the expected `<link rel="stylesheet">` tags.
3. If a page is unstyled, identify:
   - shared CSS missing from `BaseLayout`
   - page CSS missing from the page `head` slot
   - component CSS that should be promoted to page-level or shared-level linking
4. Verify with hard reload (`Ctrl+Shift+R`) and `npm run build`.

### Pages Already Following This Pattern / 已套用此模式的頁面
- `src/pages/index.astro`
- `src/pages/about.astro`
- `src/pages/palais.astro`
- `src/pages/control.astro`
- `src/pages/people-management.astro`
- `src/pages/wildland.astro`
- `src/pages/palais/fight.astro`
- `src/pages/palais/levels.astro`
- `src/pages/palais/group.astro`
- `src/pages/palais/dance.astro`
- `src/pages/palais/party.astro`
