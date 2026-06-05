# 060 — Desktop DuckDB offline fix

- **Slug**: `desktop-duckdb-offline-fix`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-060/desktop-duckdb-offline-fix`
- **Depends on**: `056-desktop-platform-registry`, `057-desktop-web-platform-impls`.
- **Estimated PR size**: tiny — ~2 files, ~80 lines.

## Notes for future you

- Driver commit: `2e26626`.
- DuckDB-wasm extension fetches normally hit `extensions.duckdb.org`. On offline desktop launch, those fetches stall and break the app. The fix bundles the extensions at build time.

## What this feature is

Build-time bundling of DuckDB-wasm extensions (e.g. `parquet`) so the offline desktop app doesn't stall waiting for `extensions.duckdb.org`.

## Steps to migrate

Apply commit `2e26626`'s changes to the DuckDB client init code and the build pipeline that ships the extension files.

## How to mark this feature completed

Standard ritual.
