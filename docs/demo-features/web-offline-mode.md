# Web read-only offline mode (ICT4D demo)

Demo-quality read-only offline support for the web app. Users must sign in online at least once on a browser before going offline.

## Demo prep

1. Sign in online.
2. In Data Manager, toggle each demo dataset to offline-only and wait for local parquet cache.
3. Open each dashboard once so React Query persists dashboard config.
4. In DevTools → Application, confirm `LocalDataset` rows and `avandar-react-query-cache` in IndexedDB.
5. DevTools → Network → Offline, then refresh. Expect workspace lists, cached datasets, and dashboards with the offline banner.
6. Run a manual query on a cached dataset in Data Explorer.
7. Try Import, Chat, Publish, or Invite: controls should be disabled or show a toast.

## Failure modes

- **Stale build without service worker:** Refresh once while online after deploying.
- **Different user on same browser:** Cache buster wipes React Query cache on user change; warm cache again online.
- **Safari private mode:** IndexedDB is volatile; use a normal browser window.

## JWT TTL (optional)

For long demos, set Supabase JWT expiry to 86400 seconds (24 h) in Authentication → Settings so token refresh rarely runs offline.
