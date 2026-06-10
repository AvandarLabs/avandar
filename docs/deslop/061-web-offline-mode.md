# 061 — Web offline mode

- **Slug**: `web-offline-mode`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-061/web-offline-mode`
- **Depends on**: `none`. **Relocated to Section 0** of `ALL_FEATURES.md` on 2026-06-10 as a cross-cutting prerequisite.
- **Required by**: `#001 async-dataset-import-pipeline` (confirmed 2026-06-10). Likely required by other UI rows in sections A/B/C/I/J that import from `@/lib/offline/*` or `@/components/offline/*`. Each consuming row's own undrift will surface its dep.
- **Estimated PR size**: medium-large. 18 new files under `src/lib/offline/` + `src/components/offline/` (~1.2k LoC). Plus surgical edits to `src/main.tsx`, `vite.config.ts`, `src/config/AvaQueryClient.ts`, and a new `vite-plugin-pwa` runtime dependency.

## Notes for future you

- **2026-06-10 — full undrift performed against `develop @ 2881b0bb`.** Scope discovered via `git diff --name-status origin/develop..origin/feat/ict4d-demo`. See "Files in scope" below.

- **2026-06-10 — `main.tsx` and `vite.config.ts` need SURGICAL ports, not wholesale.** On `feat/ict4d-demo`, both files interleave this row's offline changes with changes from other feature rows that have NOT migrated yet:
  - `main.tsx`'s feat version also wraps the app in `PlatformProvider` (belongs to row #056 `desktop-platform-registry`, which has not yet landed on develop). Skip that wrap during the port — develop's web stack runs without it. Also skip the `animationPresets.css` import (different row).
  - `vite.config.ts`'s feat version also configures whisper.wasm pathing, cross-origin-isolation headers (for SharedArrayBuffer), `worker.format`, and `optimizeDeps.exclude` for whisper + duckdb-wasm. Those are all voice/desktop scope (rows #50-55, #56-60). Skip them — leave develop's existing vite config intact except for the PWA-plugin / SW-cache additions described below.
  - **Do NOT** `git checkout origin/feat/ict4d-demo -- src/main.tsx vite.config.ts`. Apply targeted edits per "Files to surgically edit" below.

- **2026-06-10 — caller files do NOT belong in this row.** The offline-lib's call sites on `feat/ict4d-demo` (Navbar.tsx, ChatModelPicker.tsx, Composer.tsx, DataExplorerApp.tsx, DatasetImportForm.tsx, DatasetNavbar.tsx, etc.) all have OTHER feature-row changes interleaved with their offline gates. Each call site's offline-gate addition will ride along when its parent feature row migrates. Compare to row #077 `analytics-client-events`, which uses the same opportunistic-call-site strategy. **Do NOT** port the caller files in #061. Ship the lib + components + bootstrap edits only.

- **Service-worker caching strategy.** The PWA plugin uses generateSW + `runtimeCaching`. The Supabase REST URL pattern is built as a literal `RegExp` (not a closure-capturing function) because `vite-plugin-pwa` serializes `urlPattern` via `Function#toString`, which would otherwise leave `supabaseApiUrl` as an undefined free variable in the emitted `sw.js`. There is an inline comment in the feat config explaining this — preserve it verbatim.

- **`navigateFallback` and `navigateFallbackDenylist`.** SPA-shell fallback is `/index.html`; deny-list excludes `^/functions/` (Supabase edge routes) and `^/auth/`. Without the deny-list, offline navigations to Supabase auth callbacks would 200 with the SPA shell.

- **React Query persistence.** Key is `avandar-react-query-cache`; persister keyed by user id (`makeCacheBuster(user?.id)`) so a sign-out invalidates the cache. `maxAge` is 7 days. `dehydrateOptions.shouldDehydrateQuery` only persists successful queries — failed queries do not get cached as bad results.

- **AvaQueryClient becomes online-aware.** `staleTime` returns `Infinity` when offline (don't refetch), `retry` returns `false` when offline (don't burn battery), `networkMode: "offlineFirst"` on both queries and mutations.

- **Lingui prerequisite already resolved.** TSX in this row that imports from `@lingui/react/macro` type-checks on develop now that #078 has merged.

## What this feature is

Web-app offline mode: previously fetched data + the app shell stay queryable after the network drops, with UI gates that visibly disable features that need the network.

Three components:

1. **Service worker via vite-plugin-pwa.** Caches the SPA shell + selected Supabase REST endpoints. Auto-updates via `registerType: "autoUpdate"`. Boot via `registerOfflineServiceWorker()` in `src/main.tsx`.

2. **React Query persistence to IndexedDB.** `queryPersister` from `src/lib/offline/queryPersister.ts` is mounted via `PersistQueryClientProvider` in `src/main.tsx`. Cache key is `avandar-react-query-cache`. Busted on user change.

3. **Offline-aware UI primitives.** Hooks (`useIsOnline`, `useOfflineGate`, `useLocalDatasetIds`, `useOfflineBlocksCloudChat`) and components (`OfflineGated`, `OfflineIndicator`, `OfflineUnavailableTooltipLabel`) that other feature rows consume to disable / re-route their UI when offline. Plus a `formatOfflineQueryError` helper for consistent error messaging.

`isAppLinkAvailableOffline(linkSlug, { hasLocalDatasets })` is the authoritative "is this navigation viable offline?" predicate used by sidebars and nav links.

## Steps to migrate

**Step 0** — `/deslop undrift web-offline-mode` (this skill runs it before the steps below).

1. From the current `develop` HEAD, create the refactor branch in a worktree:
   ```sh
   mkdir -p ~/projects/worktrees/avandar/refactor-061
   git worktree add \
     ~/projects/worktrees/avandar/refactor-061/web-offline-mode \
     -b refactor-061/web-offline-mode \
     origin/develop
   ```

2. Inside the worktree, bring over the new lib + components verbatim:
   ```sh
   cd ~/projects/worktrees/avandar/refactor-061/web-offline-mode
   git checkout origin/feat/ict4d-demo -- \
     src/lib/offline/ \
     src/components/offline/
   ```

3. Port `src/config/AvaQueryClient.ts` wholesale (its feat diff is purely offline-aware):
   ```sh
   git checkout origin/feat/ict4d-demo -- src/config/AvaQueryClient.ts
   ```

4. Surgical-edit `src/main.tsx` to add **only** the offline pieces (see "Files to surgically edit").

5. Surgical-edit `vite.config.ts` to add **only** the PWA-plugin + SW-cache pieces.

6. Add the runtime dependency:
   ```sh
   pnpm add vite-plugin-pwa@<version-matching-feat>
   ```
   Read the exact version from `origin/feat/ict4d-demo:package.json`.

7. Run the verification commands in `Verification`.

### Files to copy verbatim

These do not exist on `develop`. Path-scoped `git checkout origin/feat/ict4d-demo --` brings them over byte-clean.

```
src/lib/offline/formatOfflineQueryError.ts
src/lib/offline/formatOfflineQueryError.test.ts
src/lib/offline/isAppLinkAvailableOffline.ts
src/lib/offline/isAppLinkAvailableOffline.test.ts
src/lib/offline/queryPersister.ts
src/lib/offline/queryPersister.test.ts
src/lib/offline/registerServiceWorker.ts
src/lib/offline/useIsOnline.ts
src/lib/offline/useIsOnline.test.ts
src/lib/offline/useLocalDatasetIds.ts
src/lib/offline/useOfflineBlocksCloudChat.ts
src/lib/offline/useOfflineGate.ts
src/lib/offline/useOfflineGate.test.tsx
src/components/offline/OfflineGated.tsx
src/components/offline/OfflineGated.module.css
src/components/offline/OfflineIndicator.tsx
src/components/offline/OfflineIndicator.test.tsx
src/components/offline/OfflineUnavailableTooltipLabel.tsx
```

### Files to wholesale-port (clean diff)

```
src/config/AvaQueryClient.ts
```

`feat`'s version replaces fixed `staleTime` / `retry` / `gcTime` with online-aware versions and adds `networkMode: "offlineFirst"`. No interleaved non-offline changes.

### Files to surgically edit on `develop`

#### `src/main.tsx`

Apply ONLY these changes (do NOT bring over the `PlatformProvider` wrap, the `animationPresets.css` import, or any other interleaved deltas):

1. Replace the import `import { QueryClientProvider } from "@tanstack/react-query";` with `import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";`.
2. Add new imports:
   ```ts
   import { makeCacheBuster, queryPersister } from "@/lib/offline/queryPersister";
   import { registerOfflineServiceWorker } from "@/lib/offline/registerServiceWorker";
   ```
3. Add `registerOfflineServiceWorker();` as a side-effect call right after the AG-Grid `registerModules` block.
4. In `MainWrapper`'s return, replace the `<QueryClientProvider client={AvaQueryClient}>` wrapper with the `<PersistQueryClientProvider>` block from feat (passing `persister`, `maxAge`, `buster: makeCacheBuster(user?.id)`, and `dehydrateOptions`).

Verify: `git diff origin/feat/ict4d-demo -- src/main.tsx` after the edit should show only the unmigrated deltas (`PlatformProvider`, `animationPresets.css`, removal of `AvandarI18nProvider` wrapper if it was already removed by #078). Anything else means the surgery missed something.

#### `vite.config.ts`

Apply ONLY these changes:

1. Add `loadEnv` to the `vite` / `vitest/config` imports as needed.
2. Add the `VitePWA` import from `vite-plugin-pwa`.
3. At the top of the `defineConfig(({ mode }) => { ... })` body, add:
   ```ts
   const env = loadEnv(mode, process.cwd(), "");
   const supabaseApiUrl = env.VITE_SUPABASE_API_URL ?? "";

   // (preserve the closure-serialization comment from feat verbatim)
   const escapeRegExp = (s: string) => {
     return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
   };
   const supabaseRestPattern =
     supabaseApiUrl ?
       new RegExp(`^${escapeRegExp(supabaseApiUrl)}/rest/`)
       : null;
   ```
4. Add `VitePWA({ ... })` to the plugins array in BOTH `mode === "test"` and the prod branch. Copy the exact `manifest`, `workbox.runtimeCaching` (using `supabaseRestPattern`), `navigateFallback`, `navigateFallbackDenylist`, and `registerType` from feat.

Do NOT bring over: `server.headers` (cross-origin isolation — voice scope), `worker.format` (voice/dataset scope), `optimizeDeps.exclude` (voice/dataset scope), the `whisperLibmainPath` constant, or any other non-PWA delta.

### Dependency changes

Add `vite-plugin-pwa` at the same version as on `feat/ict4d-demo`. Read it from `origin/feat/ict4d-demo:package.json`:
```sh
git show origin/feat/ict4d-demo:package.json | jq -r '.devDependencies["vite-plugin-pwa"] // .dependencies["vite-plugin-pwa"]'
```

Also add `@tanstack/react-query-persist-client` if it's not already in develop's `package.json` (it powers `PersistQueryClientProvider` and is referenced by `queryPersister.ts`).

### Files NOT to port in this row

- All caller files that import from `@/lib/offline/*` or `@/components/offline/*` (Navbar.tsx, ChatModelPicker.tsx, Composer.tsx, DataExplorerApp.tsx, DataImportForm.tsx, DatasetNavbar.tsx, OpenDataCatalogEntryDetail.tsx, ToggleOfflineOnlyButton.tsx, PublishDashboardButton.tsx, DashboardListView.tsx, QueryDataSourceSelect.tsx, WorkspaceUsersTab.tsx, AppToolbar.tsx, forgot-password.tsx, register.tsx, useAvandarChatRuntime.ts, useChatModelCatalog.ts). Each call site rides along when its parent feature row migrates.

## Verification

### Automated

```sh
cd ~/projects/worktrees/avandar/refactor-061/web-offline-mode
pnpm install
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/lib/offline src/components/offline src/config/AvaQueryClient.ts
```

All must pass green. No expected pre-existing warnings in this surface.

### Manual

Drive a browser; the operator should verify:

1. `pnpm dev` boots, no console errors mentioning service workers.
2. DevTools → Application → Service Workers shows the worker registered for `localhost`.
3. Sign in, navigate around — confirm `avandar-react-query-cache` populates in IndexedDB.
4. DevTools → Network → throttle to Offline. Refresh the app. The SPA shell should load from cache; previously fetched lists should still render.
5. Confirm the offline-aware QueryClient: while offline, queries don't retry; while online, they behave normally.
6. Sign out. Confirm `avandar-react-query-cache` is busted on next sign-in (different `user.id` → different buster).
7. Devtools → Application → Manifest. Confirm the PWA manifest loads (`name`, `icons`, etc.).

## Risks + things to look out for

- **SW closure serialization.** The `urlPattern` in `workbox.runtimeCaching` MUST be a `RegExp`, not a function. Preserve the inline comment explaining why.
- **`vite-plugin-pwa` and Vitest.** Some teams disable PWA in test mode. Check feat's vite config for whether `VitePWA(...)` is registered in `mode === "test"` and mirror that.
- **`PersistQueryClientProvider` boot ordering.** It must wrap the router so route loaders see the rehydrated cache. Don't move it inside the router.
- **`maxAge` is 7 days.** If a user's offline window exceeds 7 days, queries refetch on next online + day-8 visit. Don't bump this without a Privacy review (cached data is PII).
- **No service worker in dev?** vite-plugin-pwa supports `devOptions.enabled` for dev. Check feat's value and mirror it.
- **`navigateFallbackDenylist` is critical.** Without it, offline navigations to `/functions/*` or `/auth/*` will serve the SPA shell and confuse the auth flow.

## How to mark this feature completed

Standard ritual: `/deslop complete web-offline-mode` after the operator merges the refactor PR into develop. The completion procedure verifies the merge SHA, deletes the refactor branch, deletes this plan file, flips row #061 to `[x] (<merge-sha>)` in `ALL_FEATURES.md`, removes the in-flight entry from `STATE.md`, appends to the completed log, and refreshes the next plan in the queue (`#077 analytics-client-events`).
