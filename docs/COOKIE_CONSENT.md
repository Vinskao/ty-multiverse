# Cookie preferences and advertising controls

The navigation gear beside the notification bell opens `變更 Cookie 設定` and `隱私權說明`. Advertising is on by default as requested; the first-visit notice is informational and does not block the ad tags. Visitors can choose `僅必要 Cookie` or uncheck advertising in the preferences dialog.

## Flow

```mermaid
flowchart TD
  Visit[Visit page] --> Read[Read versioned local preference]
  Read -->|No saved choice| Notice[Show notice; ads use default on]
  Read -->|Advertising enabled| Ads[Load Adsterra and Monetag tags]
  Notice -->|Got it| SaveOn[Save advertising on]
  Notice -->|Necessary only| SaveOff[Save advertising off]
  Gear[Gear beside notification bell] --> Menu[Settings menu]
  Menu -->|Change cookie settings| Dialog[Preference dialog]
  Menu -->|Privacy notice| Privacy[Privacy page]
  Dialog -->|Save with advertising on| SaveOn
  Dialog -->|Save with advertising off| SaveOff
  SaveOn --> Ads
  SaveOff --> Remove[Stop pending requests and remove ad scripts/frames]
```

```mermaid
stateDiagram-v2
  [*] --> DefaultOn: no preference saved
  DefaultOn --> SavedOn: Got it / save advertising on
  DefaultOn --> SavedOff: Necessary only / turn advertising off
  SavedOn --> SavedOff: change preferences
  SavedOff --> SavedOn: change preferences
  SavedOn --> DefaultOn: clear site storage
  SavedOff --> DefaultOn: clear site storage
```

Necessary storage is always on. The optional analytics choice is stored but no third-party analytics tool is currently loaded. The privacy page describes current providers and explains that turning ads off stops new requests; third-party cookies already stored may need to be removed through browser settings.

## 開發方法

1. Added characterization tests for preference serialization, default behavior, the gear placement, privacy link, responsive banner selection, and ad removal before changing loaders.
2. Stored consent as a versioned object under `tym-cookie-consent-v1`; malformed or obsolete data is ignored. Required storage is fixed on, analytics defaults off, and advertising defaults on.
3. Kept provider keys in `src/scripts/ads/consentAds.ts` and responsive size selection in `src/scripts/ads/responsiveBanner.ts`. The ad component contains placeholders only; the loader adds third-party scripts at runtime and listens for preference changes.
4. Turning advertising off invalidates in-flight loader generations, removes provider scripts and frames, and clears the loaded state. Re-enabling it lets the normal page-load hook mount the tags again.
5. No credentials or secrets are needed. Rollout is a frontend build and site deploy; after release, check a clean browser for the notice, verify ads appear by default, then choose necessary-only and confirm the provider tags/frames disappear. Re-open settings from the bell-side gear to confirm preferences persist.

## Tests and checks

- `& $node node_modules\vitest\vitest.mjs run tests/cookies tests/ads tests/home/adPlacements.test.ts tests/about/teamHeading.test.ts`
- Build and browser rollout checks are recorded with the release commit.
