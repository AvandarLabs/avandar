# 057 — Web platform impls

- **Slug**: `desktop-web-platform-impls`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-057/desktop-web-platform-impls`
- **Depends on**: `056-desktop-platform-registry`.
- **Estimated PR size**: medium — ~4 files, ~400 lines.

## Notes for future you

- The "loud throws for not-yet-migrated paths" is intentional — anything that hits an unimplemented platform impl should fail loudly, not silently fall back to broken behavior.

## What this feature is

Web-side implementations registered into the platform registry from #056:

- `createWebDuckDbClient` — real wrapper around the legacy `DuckDbClient` singleton, adapting it to the new platform-impl interface.
- `createWebDatasetBlobStore` — Dexie-backed `LocalDataset` store wrapper.
- Loud throws for impls not yet migrated (e.g. native filesystem).

## Steps to migrate

**Step 0** — `/deslop undrift desktop-web-platform-impls`.

1. Confirm #056 has merged.
2. Copy the web impls.
3. Wire `<PlatformProvider>` to pass them in on web bootstrap.

### Files to copy verbatim

```
src/lib/platform/web/createWebDuckDbClient.ts
src/lib/platform/web/createWebDatasetBlobStore.ts
src/lib/platform/web/webPlatformImpls.ts
```

## How to mark this feature completed

Standard ritual.
