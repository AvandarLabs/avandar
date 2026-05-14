# @avandar/desktop

Electrobun shell for Avandar. Hosts the existing web app inside a native macOS / Windows webview, with a Bun-based main process for privileged operations (filesystem, SQLite, native DuckDB, keychain).

## Running locally

From repo root:

```
pnpm dev:desktop
```

This runs Vite (`pnpm dev`) and the desktop shell concurrently. The webview points at `http://localhost:5173`.

## Building

```
pnpm build:desktop
```

Produces an unsigned `.app` (macOS) or `.exe` (Windows). Code signing is configured in later phases.

## App data location

- macOS: `~/Library/Application Support/Avandar/`
- Windows: `%APPDATA%\Avandar\`

## Phase status

Phase 0 - shell only. See `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` for the broader plan.
