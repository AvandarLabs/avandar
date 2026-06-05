# 061 — Web offline mode

- **Slug**: `web-offline-mode`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-061/web-offline-mode`
- **Depends on**: `none` (independent from the desktop foundation; web has its own offline story).
- **Estimated PR size**: large — PWA + service worker + offline gates, ~1k lines.

## Notes for future you

- Driver commits: `c597869`, `7740537`, `207d422`. Spec: `docs/superpowers/plans/2026-05-20-web-read-only-offline-mode-demo.md` and `docs/demo-features/web-offline-mode.md`.
- React Query persistence key: `avandar-react-query-cache`. Keep it stable — changing it invalidates every offline user's cache.

## What this feature is

PWA + service-worker-backed offline mode for the web app:

- Service worker caches static assets + selected API responses.
- React Query persistence to IndexedDB (`avandar-react-query-cache`) so previously fetched data survives a refresh while offline.
- UI gates: features that require network (chat, model picker pulling models, etc.) are disabled or show offline banners.

## Steps to migrate

**Step 0** — `/deslop undrift web-offline-mode`.

1. Create the refactor branch.
2. Copy the service worker, React Query persistence config, and offline-gate components.
3. Wire the SW registration into the app entry.

### Files to copy verbatim

```
src/service-worker.ts (or wherever it lives)
src/lib/offline/reactQueryPersistence.ts
src/lib/offline/isAppLinkAvailableOffline.ts
src/components/OfflineBanner/OfflineBanner.tsx
```

### Files to surgically edit on `develop`

- `src/main.tsx` — register the SW.
- Various views — gate features behind `isAppLinkAvailableOffline`.

## How to mark this feature completed

Standard ritual.
