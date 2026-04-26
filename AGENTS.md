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
