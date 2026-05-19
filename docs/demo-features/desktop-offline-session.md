# Desktop offline-session demo runbook

This is the demo script for showing the Avandar desktop app surviving a
"sign in online → quit → go offline → relaunch → still works" loop.

Origin: Checkpoint 9 in `docs/ict4d-demo/CHECKPOINTS.md` (Phase 2.5
LITE — keychain-backed offline session).

## What this demonstrates

- The desktop binary holds the user's session in the macOS keychain
  (`com.avandarlabs.desktop`) rather than browser localStorage, so it
  survives WKWebView storage resets and works across launches.
- Workspace / dataset metadata is mirrored into a local SQLite database
  on first sign-in. Subsequent launches read it locally; no Supabase
  round-trip is required to show the workspace list or open a dataset.
- Dataset parquet bytes survive across launches in IndexedDB (Dexie
  inside Electrobun's WKWebView container). DuckDB-wasm queries run
  against those cached bytes with no network access.

## Prerequisites

- macOS (the keychain integration is macOS-only in V1).
- `.env.development` in the repo root with `VITE_SUPABASE_API_URL` and
  `VITE_SUPABASE_ANON_KEY` set to a reachable Supabase instance.
- A seeded Supabase user you can sign in as.
- A clean keychain entry (or be ready to delete the previous entry).

## Reset the demo state

```bash
# Optional but recommended for a clean demo:
# 1) Delete any cached desktop session from a previous run.
security delete-generic-password \
  -s com.avandarlabs.desktop -a supabase-refresh-token 2>/dev/null || true
security delete-generic-password \
  -s com.avandarlabs.desktop -a supabase-cached-session 2>/dev/null || true

# 2) Wipe the local SQLite mirror so the snapshot bootstrap runs.
rm -rf "$HOME/Library/Application Support/Avandar"
```

## Step 1 — Online sign-in (populates local cache)

```bash
pnpm install
pnpm dev:desktop
```

In the bun-main log you should see, in order:

```
[avandar-desktop] sqlite ready at …
[avandar-desktop] duckdb ready at …
[avandar-desktop] keychain + blob store ready
[avandar-desktop] ipc handlers registered
[avandar-desktop] webview loaded …
```

Sign in with your seeded user. Immediately after sign-in the bun-main
log streams the snapshot bootstrap:

```
[snapshot-bootstrap] starting
[snapshot-bootstrap] fetching workspaces
[snapshot-bootstrap] workspaces: inserted N rows
[snapshot-bootstrap] fetching datasets
[snapshot-bootstrap] datasets: inserted N rows
…
[snapshot-bootstrap] done
```

## Step 2 — Cache one dataset's parquet bytes

Open at least one dataset in the Data Explorer (or any view that loads
the parquet). Run any manual query so DuckDB-wasm registers the
parquet. This populates the Dexie `LocalDataset` row's `parquetData`
column. From now on the dataset is queryable without network access.

## Step 3 — Verify the keychain entries

In a separate terminal:

```bash
security find-generic-password \
  -s com.avandarlabs.desktop -a supabase-refresh-token -w >/dev/null \
  && echo "refresh token present"
security find-generic-password \
  -s com.avandarlabs.desktop -a supabase-cached-session -w >/dev/null \
  && echo "cached session present"
```

Both should print. The cached session is what makes Step 5 work
offline.

## Step 4 — Quit and go offline

```
Cmd+Q  (quit the desktop app fully)
```

Disable WiFi (or pull the Ethernet cable, or use Network Link
Conditioner with 100% packet loss).

## Step 5 — Relaunch offline

```bash
pnpm dev:desktop
```

Expected behaviour:

- Bun-main logs the usual boot lines (`sqlite ready`, `duckdb ready`,
  `keychain + blob store ready`, `ipc handlers registered`, `webview
  loaded`).
- The webview opens. Because the refresh-token exchange against
  Supabase fails offline, the desktop auth handler falls back to the
  keychain's cached access-token payload and returns the session with
  `mode: "offline-cached"`.
- The user lands on their workspace, **not the sign-in page**.
- The workspace list / dataset list render from local SQLite via the
  `createRdbCrudClient → createSqliteCrudClient → IPC → bun:sqlite`
  chain. No Supabase calls.
- Opening the dataset cached in Step 2 and running a manual query
  works — DuckDB-wasm reads from the Dexie row.

If the user signs out (`Settings → Sign out`) the keychain entries are
deleted and the next launch shows the sign-in screen. To re-demo,
repeat from Step 1 with the keychain reset.

## What still requires network (acceptable for the demo)

- Importing a new dataset (Supabase Storage upload + parquet transcode
  during initial cache).
- Chat / LLM queries (Edge Function calls).
- Password reset / email change / new-user registration.
- Sharing / publishing dashboards.

These all surface clear UI errors when offline — they don't crash the
shell.

## Failure modes to watch

- **Sign-in returns the wrong error or hangs.** The IPC bridge has
  never been verified end-to-end in CI; the first place to look is
  `apps/desktop/main/ipc/createElectrobunIpcTransport/` and the
  page-world bridge script in `desktopIpcBridgeScript/`. The plan at
  `docs/superpowers/plans/2026-05-19-electrobun-desktop-phase-2.5-consumer-migration.md`
  (Task 1) documents the round-trip smoke test to run from the page
  console.
- **"You're signed out" on offline relaunch.** Confirm both keychain
  entries exist (Step 3). If only `supabase-refresh-token` is there,
  the user signed in before Checkpoint 9 landed — sign out and sign
  back in once online to rewrite the cached session.
- **"No data" on offline relaunch.** Confirm
  `~/Library/Application Support/Avandar/metadata.sqlite` is
  populated. Snapshot bootstrap only fires on the first online
  sign-in; if it failed, sign out, delete the SQLite file, sign back
  in.
