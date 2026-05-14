# @avandar/desktop

Electrobun shell for Avandar. Hosts the existing web app inside a native macOS / Windows webview, with a Bun-based main process for privileged operations (filesystem, SQLite, native DuckDB, keychain).

## Running locally

From repo root:

```
pnpm dev:desktop
```

`dev:desktop` runs `scripts/devDesktop.sh`, which checks whether Vite is already serving on `:5173`:

- **If `pnpm dev` is already running in another terminal**, it reuses that dev environment and only starts the desktop shell.
- **If nothing is on `:5173`**, it starts `pnpm dev` (Vite + Supabase Functions + ngrok + fastify) and the desktop shell concurrently. Closing either tears down both.

You can also run `pnpm dev` and `pnpm dev:desktop` simultaneously without spawning the dev environment twice.

The webview points at `http://localhost:5173`. Internally, the desktop package's `dev` script invokes `electrobun dev`, which rebuilds the `.app` and launches it — bare `bun run main/index.ts` does not work because Electrobun's native FFI is only initialized by the launched `.app` launcher, not by Bun directly.

## Building

```
pnpm build:desktop
```

Produces an unsigned `.app` (macOS) or `.exe` (Windows). Code signing is configured in later phases.

## App data location

- macOS: `~/Library/Application Support/Avandar/`
- Windows: `%APPDATA%\Avandar\`

## Build output location

Electrobun 1.18.1 emits the packaged app under `apps/desktop/build/<channel>-<arch>/<AppName>-<channel>.app`. For a local dev-channel build on Apple Silicon:

```
apps/desktop/build/dev-macos-arm64/Avandar-dev.app
```

(Channel and arch vary with `targets`. The plan referenced `apps/desktop/bundle/<arch>/Avandar.app` but the real layout matches the above.)

## Unsigned builds (Phase 0)

The Phase 0 bundle is unsigned. macOS will refuse to open it on first launch with a "developer cannot be verified" Gatekeeper warning. To bypass during development:

```
xattr -dr com.apple.quarantine apps/desktop/build/dev-macos-arm64/Avandar-dev.app
```

Code signing & notarization land in Phase 4.

## Phase status

Phase 0 - shell only. See `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` for the broader plan.
