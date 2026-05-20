# Web read-only offline mode (ICT4D demo)

**Status:** draft plan, not yet implemented
**Branch this plan lives on:** `claude/offline-mode-assessment-CZyq0`
**Target implementation branch:** `claude/web-offline-mode-demo` (cut from `develop` once approved — keep separate from this assessment branch until the plan is reviewed)
**Scope:** Demo-quality, read-only. No sync engine. No SQLite. Web app only.

---

## Goal

After the demo presenter signs in online once and warms the cache, they can:

1. Disable WiFi, then refresh the tab or close-and-reopen the tab, and still land in their workspace (auth survives, no login screen).
2. Browse the workspace list, dataset list, dashboard list, dataset metadata pages — all rendered from cached data.
3. Run DuckDB-wasm queries against any dataset whose parquet bytes are in IndexedDB.
4. See unambiguous UI that they are offline and that certain actions (import, chat, publish, share, signup, password reset) are not available right now.

Workspaces and data must stay siloed per signed-in user — same browser, different user account means a different cache.

## Non-goals

- Writes / mutations while offline.
- Sync engine (queueing edits to replay when online).
- SQLite mirror on web (we keep using Dexie + DuckDB-wasm).
- New-user signup or password reset offline.
- Chat / LLM / edge function offline support.
- First-launch offline (user must sign in online at least once on this browser).

---

## Architecture summary (what is already in place)

| Concern | Already works | What it gives us |
|---|---|---|
| App shell as SPA | TanStack Router, all routes from `index.html` | Deep links work offline once shell is cached |
| Session persistence | `@supabase/supabase-js` writes session to `localStorage` | `getSession()` returns cached user across refresh |
| Local parquet cache | Dexie `LocalDataset` table keyed by `(datasetId)`, indexed on `userId` + `workspaceId` (`src/db/dexie/dexieVersions.ts`) | Already siloed per user/workspace |
| Local query engine | DuckDB-wasm in browser, parquet bytes read from Dexie | Queries against cached datasets already run with zero network |
| Offline toggle UI | `ToggleOfflineOnlyButton` on `DatasetMetaView` | Users can already mark datasets offline-only |
| Central React Query config | Single `AvaQueryClient` in `src/config/AvaQueryClient.ts` | One place to plug in persistence |
| CRUD client indirection | `createRdbCrudClient` already swaps Supabase ↔ SQLite on desktop | Easy spot to short-circuit reads when offline |

## What is missing (the four gaps)

1. App shell is not precached → refresh offline = browser "no internet" page.
2. React Query cache is in-memory only → refresh offline = empty workspace/dataset lists.
3. Supabase auto-refresh on near-expiry tokens fires `SIGNED_OUT` when it fails offline → user gets kicked to login.
4. UI does not communicate "you are offline, read-only" or which datasets are queryable offline.

---

## Implementation plan

### Phase 1 — App shell precache (PWA service worker)

**Estimate:** half day
**Owner files:**
- `vite.config.ts` (modify)
- `src/main.tsx` (modify: register the SW)
- `package.json` (add dep)
- new: `src/lib/offline/registerServiceWorker.ts`

**Add the dependency:**
```bash
pnpm add -D vite-plugin-pwa
```

**`vite.config.ts` — add the plugin:**
```ts
import { VitePWA } from "vite-plugin-pwa";

// inside plugins array, after react():
VitePWA({
  registerType: "autoUpdate",
  injectRegister: false,           // we register manually so we can show a "new version" toast
  workbox: {
    // DuckDB wasm + workers are imported with ?url and live in /assets — make
    // sure they end up in the precache. Bump maximumFileSizeToCacheInBytes
    // because the DuckDB wasm bundle is ~6 MB.
    globPatterns: [
      "**/*.{js,css,html,ico,png,svg,woff2,wasm}",
    ],
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [
      // Don't intercept Supabase or edge-function calls
      /^\/functions\//,
      /^\/auth\//,
    ],
    runtimeCaching: [
      {
        // Workspace/dataset/dashboard reads from Supabase REST → cache last
        // good response so an offline read after refresh still returns data.
        urlPattern: ({ url }) =>
          url.origin === import.meta.env.VITE_SUPABASE_API_URL &&
          url.pathname.startsWith("/rest/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-rest",
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        // Storage downloads (parquet bytes) — let Dexie be the source of
        // truth, don't double-cache.
        urlPattern: ({ url }) =>
          url.pathname.startsWith("/storage/v1/object"),
        handler: "NetworkOnly",
      },
    ],
  },
  manifest: {
    name: "Avandar",
    short_name: "Avandar",
    theme_color: "#0e8a76",
    background_color: "#ffffff",
    display: "standalone",
    icons: [
      { src: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
}),
```

**`src/lib/offline/registerServiceWorker.ts` (new):**
```ts
import { registerSW } from "virtual:pwa-register";
import { notifyInfo } from "@ui";

export function registerOfflineServiceWorker(): void {
  if (import.meta.env.DEV) return;        // skip in dev — HMR conflicts with SW caching

  registerSW({
    immediate: true,
    onNeedRefresh() {
      notifyInfo(
        "A new version is available. Refresh to update.",
        { autoClose: false },
      );
    },
    onOfflineReady() {
      // No toast — we already have the offline banner.
    },
  });
}
```

**`src/main.tsx` — call it once at startup:**
```ts
import { registerOfflineServiceWorker } from "@/lib/offline/registerServiceWorker";

registerOfflineServiceWorker();
```

**Verification checklist:**
- `pnpm build && pnpm preview`, open DevTools → Application → Service Workers, confirm activated.
- DevTools → Network → check "Offline", refresh page → app shell loads.
- Confirm `duckdb-*.wasm` is in the precache list (DevTools → Application → Cache Storage).

---

### Phase 2 — Persist React Query cache to IndexedDB

**Estimate:** half day
**Owner files:**
- `src/config/AvaQueryClient.ts` (modify — wrap with persister)
- `src/main.tsx` (modify — swap `QueryClientProvider` for `PersistQueryClientProvider`)
- new: `src/lib/offline/queryPersister.ts`
- new: `src/lib/offline/useIsOnline.ts`
- `package.json` (add deps)

**Add dependencies:**
```bash
pnpm add @tanstack/react-query-persist-client @tanstack/query-async-storage-persister idb-keyval
```

**`src/lib/offline/queryPersister.ts` (new):**
```ts
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

const STORE_KEY = "avandar-react-query-cache";

const idbStorage = {
  getItem: async (key: string) => (await get(key)) ?? null,
  setItem: (key: string, value: string) => set(key, value),
  removeItem: (key: string) => del(key),
};

export const queryPersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: STORE_KEY,
  throttleTime: 1000,
  // Per spec docs: serializer is JSON by default. Our model parsers store
  // ISO date strings (not Date objects) on the parsed model, so JSON round
  // trips cleanly. Audit during impl: anything that stores a Date object
  // on a model needs to use a Zod transform that emits a string.
});

/**
 * Cache key buster — bump when query shapes change. Also includes the user
 * id so two users on the same browser don't read each other's cached data.
 */
export function makeCacheBuster(userId: string | undefined): string {
  const appVersion = import.meta.env.VITE_APP_VERSION ?? "dev";
  return `v1:${appVersion}:${userId ?? "anon"}`;
}
```

**`src/lib/offline/useIsOnline.ts` (new):**
```ts
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,           // SSR fallback (n/a here but cheap)
  );
}

/** Imperative variant for code outside React. */
export function getIsOnline(): boolean {
  return navigator.onLine;
}
```

**`src/config/AvaQueryClient.ts` — adjust defaults so offline reads don't refetch:**
```ts
import { QueryClient } from "@tanstack/react-query";
import { getIsOnline } from "@/lib/offline/useIsOnline";

export const AvaQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,

      // When offline, treat any cached value as fresh forever so we never
      // try (and fail) to refetch. Falls back to the original 5 min online.
      staleTime: () => (getIsOnline() ? 6 * 60 * 1000 : Number.POSITIVE_INFINITY),
      gcTime: 24 * 60 * 60 * 1000,        // bump to 24h so cache survives long sessions

      // Don't retry offline failures — they will just spin.
      retry: (failureCount: number, error: unknown) => {
        if (!getIsOnline()) return false;
        return failureCount < 1;
      },

      // When offline, don't even attempt the network. React Query will return
      // the cached value if present, or stay in loading state if not.
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: 0,
      networkMode: "offlineFirst",
    },
  },
});
```
(Note: `staleTime` accepting a function requires React Query ≥ 5.0 — already pinned at `^5.81.5`.)

**`src/main.tsx` — wrap with `PersistQueryClientProvider`:**
```tsx
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryPersister, makeCacheBuster } from "@/lib/offline/queryPersister";

function MainWrapper() {
  const { user } = useAuth(AvaRouter);
  const context: AvaRouterRootContext = useMemo(
    () => ({ user, queryClient: AvaQueryClient }),
    [user],
  );

  useEffect(() => {
    AvaDexie.syncDBVersion(user);
  }, [user]);

  return (
    <PersistQueryClientProvider
      client={AvaQueryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
        buster: makeCacheBuster(user?.id),
        dehydrateOptions: {
          // Don't persist failed/canceled queries — they will refetch
          // when next online.
          shouldDehydrateQuery: (q) => q.state.status === "success",
        },
      }}
    >
      <RouterProvider router={AvaRouter} context={context} />
    </PersistQueryClientProvider>
  );
}
```

**Risks / verification:**
- Audit each Zod parser for `z.date()` outputs that wouldn't survive JSON serialization. The fix is `z.string().pipe(z.coerce.date())` if a parser does this. Grep: `grep -rn "z\\.date(" shared/models src/models | wc -l`.
- After persistence is on, `clearQueryCache` on sign-out is required so the next user doesn't see the previous user's cached lists. Already handled by `makeCacheBuster` switching on `user?.id`, but verify by signing in/out repeatedly in dev.

---

### Phase 3 — Auth survives offline token refresh

**Estimate:** 2-3 hours
**Owner files:**
- `src/lib/hooks/auth/useAuth.ts` (modify)
- `src/clients/AuthClient.ts` (modify — add helpers)
- Supabase dashboard: bump JWT TTL (out of repo)

**`src/clients/AuthClient.ts` — tolerate offline refresh:**
The Supabase JS client emits `TOKEN_REFRESHED` on success, and on failure (offline) it may emit `SIGNED_OUT` after retrying. The fix is to filter `SIGNED_OUT` events in `useAuth` based on whether the user signed out themselves.

**`src/lib/hooks/auth/useAuth.ts` — subscribe with offline-aware filter:**
```ts
const subscription = AuthClient.onAuthStateChange((event, newSession) => {
  // Treat a SIGNED_OUT event as a sign-out only if the user explicitly asked
  // for it. If we're offline and Supabase couldn't refresh, keep showing the
  // cached session — the banner will tell the user they're offline.
  if (
    event === "SIGNED_OUT" &&
    !AuthClient.isManuallySignedOut() &&
    !navigator.onLine
  ) {
    return;
  }

  if (newSession?.user) {
    const searchParams = new URLSearchParams(router.state.location.search);
    const redirectParam = searchParams.get("redirect");
    if (redirectParam) {
      pendingRedirectRef.current = redirectParam;
    }
  }
  setUser(newSession?.user ?? undefined);
});
```

**Belt-and-suspenders:** bump the Supabase access token TTL to 24 h in the Supabase dashboard (Authentication → Settings → JWT expiry limit, set to `86400`). For a demo lasting a few hours we never approach the refresh path. Document this in `docs/demo-features/web-offline-mode.md`.

**Verification:**
- Sign in online, switch WiFi off, refresh → still authed.
- Sign out (explicit) → kicks to login as expected.
- Wait until token expires while offline (or temporarily set TTL to 60s in dev) → app stays authed, banner shows offline state.

---

### Phase 4 — Offline UI: banner, action gating, dataset badges

**Estimate:** 1 day total (covers all UX surfaces)
**Owner files:** see each subsection.

#### 4.1 Global "You are offline" banner

**New:** `src/components/OfflineBanner/OfflineBanner.tsx`
```tsx
import { Alert } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";
import { useIsOnline } from "@/lib/offline/useIsOnline";

export function OfflineBanner(): JSX.Element | null {
  const isOnline = useIsOnline();
  if (isOnline) return null;

  return (
    <Alert
      icon={<IconWifiOff size={16} />}
      color="yellow"
      radius={0}
      withCloseButton={false}
    >
      You are offline. The app is in read-only mode — cached datasets and
      dashboards are available, but new imports, chat, and sharing are
      paused until you reconnect.
    </Alert>
  );
}
```

**Insert** at the top of `WorkspaceLayout` (`src/components/layouts/WorkspaceLayout/WorkspaceLayout.tsx` — confirm path during impl) above the AppShell content so every workspace page picks it up.

#### 4.2 Hook for gating actions: `useOfflineGate`

**New:** `src/lib/offline/useOfflineGate.ts`
```ts
import { notifyError } from "@ui";
import { useIsOnline } from "@/lib/offline/useIsOnline";

type Gate = {
  /** True when offline — wire to a Button `disabled` prop. */
  isBlocked: boolean;
  /** Tooltip text to show next to the disabled control. */
  tooltip: string;
  /**
   * Wrap an onClick handler so it short-circuits with a toast when offline.
   * Use this for actions that can't be visually disabled (e.g. context-menu
   * items, keyboard shortcuts).
   */
  guard: <T extends (...args: never[]) => unknown>(fn: T) => T;
};

export function useOfflineGate(
  reason = "This action is not available offline.",
): Gate {
  const isOnline = useIsOnline();
  return {
    isBlocked: !isOnline,
    tooltip: reason,
    guard: ((fn) =>
      ((...args) => {
        if (!navigator.onLine) {
          notifyError(reason);
          return undefined;
        }
        return fn(...args);
      }) as typeof fn) as Gate["guard"],
  };
}
```

**Wire-up surfaces (one-liner each, list per file):**
| File | Action gated |
|---|---|
| `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadDropzone.tsx` | Dropzone overlay + onDrop handler |
| `src/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.tsx` | "Import" submit button |
| `src/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogEntryDetail.tsx` | "Add to workspace" button |
| `src/components/ChatPanel/ChatPanelComposer.tsx` (path to confirm) | Composer Send button + Enter handler |
| `src/views/DashboardBuilderApp/PublishDashboardButton.tsx` | "Publish" / "Manage sharing" trigger |
| `src/views/WorkspaceSettingsPage/InvitesTab/InviteForm.tsx` | "Send invite" |
| `src/routes/register.tsx`, `src/routes/forgot-password.tsx` | Disable form submit + show "needs network" message |
| `src/components/AppDropzone/AppDropzone.tsx` | Skip mounting the dropzone listener when offline |

Pattern in each spot:
```tsx
const offline = useOfflineGate("Importing a new dataset requires an internet connection.");

<Tooltip label={offline.tooltip} disabled={!offline.isBlocked}>
  <Button
    onClick={offline.guard(handleImport)}
    disabled={offline.isBlocked}
    aria-disabled={offline.isBlocked}
  >
    Import
  </Button>
</Tooltip>
```

For non-button surfaces (context menus, hotkeys) wrap the handler with `offline.guard(...)` and let the toast handle feedback.

#### 4.3 Dataset list: "Available offline" badge

The dataset list lives in `DatasetNavbar.tsx` (sidebar) and on `DatasetMetadataList.tsx` (the table view). A dataset is "available offline" iff a `LocalDataset` row exists in Dexie for `(userId, workspaceId, datasetId)`.

**New hook:** `src/lib/offline/useLocalDatasetIds.ts`
```ts
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";     // confirm path
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

/**
 * Returns the set of dataset ids for which parquet bytes are cached in
 * Dexie for the current user + workspace. Live — updates as datasets are
 * toggled offline-only.
 */
export function useLocalDatasetIds(): Set<DatasetId> {
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();

  const rows = useLiveQuery(
    () =>
      AvaDexie.DB.LocalDataset
        .where({ userId: user.id, workspaceId: workspace.id })
        .primaryKeys(),
    [user?.id, workspace?.id],
    [] as DatasetId[],
  );

  return useMemo(() => new Set(rows ?? []), [rows]);
}
```

**`DatasetNavbar.tsx` — add a teal "Offline" badge per row when present:**
```tsx
const localIds = useLocalDatasetIds();
// inside the row render:
{localIds.has(dataset.id) ? (
  <Tooltip label="Available offline — parquet cached on this device">
    <Badge size="xs" color="teal" variant="light">Offline</Badge>
  </Tooltip>
) : null}
```

**`DatasetMetadataList.tsx`** — add a column showing the same badge, or render it inline next to the dataset name. Decision: inline next to the name (matches the navbar pattern, no schema change to the AG-Grid column defs).

**Dashboard list** (`src/views/DashboardsApp/DashboardsList.tsx` — confirm path):
Dashboards don't themselves have parquet; they contain visualizations bound to datasets. The "is this dashboard available offline" rule: **every dataset referenced by every viz in the dashboard has a local parquet row.** Compute once per dashboard:

```ts
const localIds = useLocalDatasetIds();
const datasetIdsByDashboard = useMemo(() => {
  return new Map(
    dashboards.map((d) => [d.id, Dashboard.collectDatasetIds(d)]),
  );
}, [dashboards]);

function isDashboardOffline(d: Dashboard.T): "full" | "partial" | "none" {
  const ids = datasetIdsByDashboard.get(d.id) ?? [];
  if (ids.length === 0) return "full";
  const have = ids.filter((id) => localIds.has(id)).length;
  if (have === ids.length) return "full";
  if (have === 0) return "none";
  return "partial";
}
```

Render: teal `Offline ready` badge for `full`, yellow `Partially offline` for `partial`, no badge for `none`. (`Dashboard.collectDatasetIds` is a small helper to add in `shared/models/Dashboard/Dashboard.ts` — walk `dashboardConfig.vizs[*].dataSourceId`.)

#### 4.4 Query data source dropdown: red badge only on un-queryable datasets

Per the brief, the dropdown should **stay clean**: show a red badge **only on datasets that are not in IndexedDB** (and therefore can't be queried offline). When online or for datasets that are cached, show nothing.

**`src/views/DataExplorerApp/QueryDataSourceSelect.tsx`** — switch to Mantine `Select` with `renderOption`:

```tsx
const localIds = useLocalDatasetIds();
const isOnline = useIsOnline();

// inside dataSourceOptions construction, swap makeSelectOptions for a
// hand-rolled mapping that includes a `disabled` flag when offline+missing:
const buildOption = (ds: QueryDataSource) => {
  const isDataset = "sourceType" in ds;     // entity configs don't need a badge
  const isCached = isDataset && localIds.has(ds.id as DatasetId);
  const isUnqueryableOffline = !isOnline && isDataset && !isCached;
  return {
    value: ds.id,
    label: ds.name,
    disabled: isUnqueryableOffline,
    meta: { isUnqueryableOffline },          // consumed by renderOption
  };
};

<Select
  data={...}
  renderOption={({ option }) => (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm">{option.label}</Text>
      {option.meta?.isUnqueryableOffline ? (
        <Tooltip label="Not available offline — open this dataset while online to cache it.">
          <Badge size="xs" color="red" variant="light">Not offline</Badge>
        </Tooltip>
      ) : null}
    </Group>
  )}
  ...
/>
```

If the Mantine `Select` wrapper in `@ui` does not yet pass through `renderOption`, extend its prop forwarding — the underlying `@mantine/core` `Select` supports it natively.

**Important:** when online, the dropdown shows **no badge** anywhere (we don't want to add clutter). The red badge only appears when `!isOnline`.

#### 4.5 Query execution path: clearer error when offline + uncached

`DuckDbClient.query` already fails when the parquet table isn't registered. Wrap the call site in `DataExplorerApp` so the error message reads:

> "This dataset's data isn't cached on this device. Connect to the internet, open the dataset, then try again."

Catch the specific error in `useRunQuery` (or wherever `DuckDbClient.query` is called from the data explorer) and replace the generic toast with the message above when `!navigator.onLine`.

---

### Phase 5 — Demo runbook + dev verification

**Estimate:** 2 hours
**Owner files:**
- new: `docs/demo-features/web-offline-mode.md` (mirror the desktop runbook)

**Demo prep script (manual, no code):**
1. Online: sign in.
2. Visit Data Manager → toggle each demo dataset to "offline-only" (waits for `ToggleOfflineOnlyButton` upload to finish).
3. Visit each dashboard once so React Query persists the dashboard config.
4. DevTools → Application → confirm `LocalDataset` rows exist and `avandar-react-query-cache` exists.
5. DevTools → Network → toggle Offline.
6. Refresh page → expect workspace + dataset list + dashboards to render, with the offline banner across the top.
7. Open a cached dataset → expect Data Explorer to load, run a manual query → expect results.
8. Open an uncached dataset → expect a clear "not available offline" error (Phase 4.5).
9. Click Import / Chat / Publish / Invite → expect tooltip + disabled state or a toast.

**Document failure modes:**
- App shell isn't installed → user is on a stale build that predates the SW. Fix: refresh once online.
- Cache buster mismatch on sign-in (different user on same browser) → React Query cache is wiped intentionally; user must warm cache once online.
- Safari private mode → IndexedDB is volatile. Document that the demo requires a normal browsing window (Chrome or Safari non-private).

---

## File-by-file change summary

| File | Change |
|---|---|
| `package.json` | Add `vite-plugin-pwa`, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `idb-keyval` |
| `vite.config.ts` | Add VitePWA plugin block (Phase 1) |
| `src/main.tsx` | Register SW; swap to `PersistQueryClientProvider` |
| `src/config/AvaQueryClient.ts` | Offline-aware `staleTime`, `gcTime`, `networkMode`, `retry` |
| `src/clients/AuthClient.ts` | (no functional change; verify `isManuallySignedOut` is reset on sign-in) |
| `src/lib/hooks/auth/useAuth.ts` | Ignore SIGNED_OUT when offline + not manual |
| `src/lib/offline/useIsOnline.ts` | **new** — hook + imperative getter |
| `src/lib/offline/useOfflineGate.ts` | **new** — `{ isBlocked, tooltip, guard }` |
| `src/lib/offline/useLocalDatasetIds.ts` | **new** — live Dexie set |
| `src/lib/offline/queryPersister.ts` | **new** — IDB persister + buster |
| `src/lib/offline/registerServiceWorker.ts` | **new** |
| `src/components/OfflineBanner/OfflineBanner.tsx` | **new** |
| `src/components/layouts/WorkspaceLayout/WorkspaceLayout.tsx` | Mount `<OfflineBanner />` |
| `src/views/DataManagerApp/DatasetNavbar.tsx` | "Offline" badge per dataset row |
| `src/views/DataManagerApp/DatasetMetaView/DatasetMetadataList.tsx` | "Offline" badge inline with name |
| `src/views/DashboardsApp/DashboardsList.tsx` | "Offline ready" / "Partially offline" badge per dashboard |
| `shared/models/Dashboard/Dashboard.ts` | Add `Dashboard.collectDatasetIds` helper |
| `src/views/DataExplorerApp/QueryDataSourceSelect.tsx` | Red "Not offline" badge only when offline + uncached |
| `src/views/DataExplorerApp/<useRunQuery file>` | Friendlier error when offline + uncached |
| `src/views/DataManagerApp/DataImportView/**/*.tsx` | `useOfflineGate` on import surfaces |
| `src/components/AppDropzone/AppDropzone.tsx` | Skip listener when offline |
| `src/components/ChatPanel/*.tsx` | Disable composer when offline |
| `src/views/DashboardBuilderApp/PublishDashboardButton.tsx` | Disable when offline |
| `src/views/WorkspaceSettingsPage/InvitesTab/InviteForm.tsx` | Disable when offline |
| `src/routes/register.tsx`, `src/routes/forgot-password.tsx` | Block submit when offline |
| `docs/demo-features/web-offline-mode.md` | **new** — runbook |

Approx. **18 new/touched files**, ~600-800 lines of code + ~150 lines of docs.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Persisted React Query cache deserializes `Date` objects as strings | Audit Zod parsers; convert any `z.date()` consumers to `z.coerce.date()` (cheap), or write a custom serializer. Verify in Phase 2. |
| Supabase JS auto-refresh storm on boot offline | Phase 3 filter + bump JWT TTL in dashboard. |
| DuckDB-wasm not precached → first load offline = white screen | Phase 1 `globPatterns` + bumped `maximumFileSizeToCacheInBytes`; verify in DevTools cache inspector. |
| Stale SW serving an old build to demo presenter | `registerType: "autoUpdate"` + an "update available — refresh" toast. |
| Two users on the same browser see each other's cached queries | `makeCacheBuster(user?.id)` invalidates the persisted cache on user change. |
| User toggles a dataset offline-only mid-demo while offline | The toggle itself requires network (storage delete). Already gated by the import-side restriction; verify the toggle button shows the offline gate too. |
| Safari private mode wipes IDB on tab close | Document in runbook; not a code fix. |

---

## Branching and review

- This plan file is committed on `claude/offline-mode-assessment-CZyq0` (the assessment branch) for local review.
- Implementation work happens on a new branch `claude/web-offline-mode-demo` (cut from `develop` once the plan is approved).
- Phases 1–5 land as separate commits inside that branch so review is incremental.
- Open a PR against `develop` (or `feat/ict4d-demo` if that's the demo target) when all phases are verified per the runbook.
- **Do not merge to `develop` without** completing the manual demo runbook end-to-end and confirming the four checkpoints: refresh-survives, cached-dashboards-render, queries-run, gated-actions-feedback.

---

## Total estimate

**~1.5-2 dev days** for everything above.
Minimum viable cut (Phases 1 + 2 + 3 + the banner only): **~1 day**.
