# 056 — Desktop platform registry

- **Slug**: `desktop-platform-registry`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-056/desktop-platform-registry`
- **Depends on**: `none` (this is the foundation that offline-session, bootstrap-snapshot, and duckdb-offline all build on).
- **Estimated PR size**: small — ~3 files, ~250 lines.

## Notes for future you

- This is the **platform abstraction foundation**. Without it, anything desktop-aware (offline auth, sync engine) can't compile cross-platform. Land first.
- Module-level `getPlatformImpls` / `setPlatformImpls` deliberately throws if read before the React provider mounts — catches "platform leaked into module init" bugs at startup.
- Spec: `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`.

## What this feature is

Two-layer platform abstraction:

- Module-level `getPlatformImpls` / `setPlatformImpls` — global registry that any non-React code can read.
- `<PlatformProvider>` React component — publishes resolved impls into the registry on mount. Throws loudly if `getPlatformImpls` is called before mount.

## Steps to migrate

**Step 0** — `/deslop undrift desktop-platform-registry`.

1. Create the refactor branch off `develop`.
2. Copy the registry + provider verbatim.
3. Mount the provider in the app root.

### Files to copy verbatim

```
src/lib/platform/platformRegistry.ts
src/lib/platform/PlatformProvider.tsx
src/lib/platform/platformImpls.types.ts
```

### Files to surgically edit on `develop`

- The app root (or `RootLayout`) — mount `<PlatformProvider>` at the top.

## How to mark this feature completed

Standard ritual.
