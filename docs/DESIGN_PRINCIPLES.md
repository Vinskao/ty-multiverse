# TY Multiverse design principles

This note is a handoff contract for future agents and contributors. Preserve the product's design judgment when changing pages; do not treat the work as a color-swap exercise.

## Product character

TY Multiverse is a working investment research environment built by an individual investor with software engineering experience. It should feel like a focused professional instrument: direct, deliberate, information-dense, and usable without explaining itself in marketing language. The About page is also a founder portfolio and must retain the downloadable résumé.

## Visual language

- Use black, white, and restrained grays for the site's foundations, surfaces, borders, typography, and primary controls. Follow the site's light/dark theme tokens instead of hard-coding a one-theme solution.
- Prefer strong type hierarchy, generous chart space, precise alignment, and quiet hairline borders over piles of cards, badges, gradients, glows, or decorative accent colors.
- Keep the interface bold and concise while preserving information. Reduce visual prominence or collapse low-frequency details; do not delete useful research data merely to make a page look sparse.
- Color remains available when it conveys data meaning: price direction, severity, risk, and chart categories. Remove purple as a decorative brand color on About. Do not recolor semantic data solely to enforce monochrome.
- Empty states should tell the user what to do and what becomes available after that action. A large unexplained blank plot is not an acceptable empty state.
- Use responsive layouts that give charts the width they need on desktop and retain readable controls on mobile.

## Interaction and information order

- Put the primary decision or action first. Put low-frequency summaries and metadata after it, collapsed by default where appropriate.
- Make the fast path short: filenames can supply report titles; multiple PDFs can be selected and uploaded together; optional metadata remains available without blocking submission.
- A language toggle should update page content in place and keep the URL in sync. Failure should preserve the current page and report the problem accessibly rather than unexpectedly navigating away.
- Keep section hierarchy explicit. About uses Team → Founder; personality and career overview is secondary and collapsible; résumé preview/download remains available.
- Remove redundant calls to action and monitoring/product links that distract from the visitor's task. Do not invent company scale, team members, customers, revenue, or traction.

## Review checklist

Before changing a page, identify its primary user task, high-frequency action, and low-frequency detail. After changing it, check both light and dark theme tokens, focus states, mobile width, charts, empty states, and whether all important content remains accessible. Tests should cover extracted behavior and layout decisions; use browser review when the documented browser runtime is available.

## Related implementation

- `MONOCHROME_WORKSPACE_REDESIGN.md` describes the current redesign scope and acceptance criteria.
- `../src/styles/global.css`, `../src/styles/index.css`, and `../src/styles/about.css` hold shared/page-specific styles.
