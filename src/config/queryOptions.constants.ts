import type { UseQueryOptions } from "@hooks";

/**
 * A `useQuery` option preset, refining the global policy in `AvaQueryClient`:
 * forces a fetch every time a query mounts, even when the cached entry is
 * still considered fresh.
 *
 * Needed because the React Query cache is persisted to IndexedDB (see
 * `AvandarQueryClientProvider`) and restored on boot, while the default
 * `staleTime` in `AvaQueryClient` keeps a restored entry valid for its whole
 * window. Persister writes are throttled, so a reload that happens right
 * after a mutation can restore the *pre-mutation* snapshot, which still
 * counts as fresh and therefore never refetches: the screen then shows
 * pre-mutation data for that entire window with no way to refresh it.
 *
 * Use this for lists that are administered on the same screens that mutate
 * them (workspace members, user groups, and other permission lookups), where
 * showing a stale snapshot means showing the wrong access.
 */
export const ALWAYS_REFETCH_ON_MOUNT = {
  refetchOnMount: "always",
} as const satisfies Pick<UseQueryOptions, "refetchOnMount">;
