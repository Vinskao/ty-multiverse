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
