import { getIsOnline } from "@avandar/browser-utils";
import { QueryClient } from "@tanstack/react-query";
import { WorkspaceMembershipDenied } from "@/clients/qetl/assertWorkspaceMembership/WorkspaceMembershipDenied";
import { SessionExpiredError } from "$/ServerApiClient";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export const AvaQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No background refetches: queries that should re-fetch on focus or
      // reconnect must opt in explicitly per `useQuery` call.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,

      // Still fetch on mount if the query is stale or absent.
      refetchOnMount: true,

      // Online: 6 minutes (the prior baseline). Offline: never stale, so
      // React Query serves the persisted cache and does not try to refetch.
      staleTime: () => {
        return getIsOnline() ? 6 * MINUTE_MS : Number.POSITIVE_INFINITY;
      },

      // Keep unused query data around for 24h so navigating back to a
      // recently-visited screen does not re-fetch from scratch.
      gcTime: 24 * HOUR_MS,

      // Online: 1 retry on failure. Offline: do not retry because the call
      // is guaranteed to fail and the user already sees the offline banner.
      // A dead session is not retryable: the invoke wrapper already refreshed
      // once and gave up, so a retry would just repeat a failing 401.
      retry: (failureCount: number, error: unknown) => {
        if (error instanceof SessionExpiredError) {
          return false;
        }
        // An authorization refusal is a decision, not a fault. Retrying it
        // repeats the same membership read and reaches the same answer, so it
        // only delays the error the caller is waiting on.
        if (error instanceof WorkspaceMembershipDenied) {
          return false;
        }
        return getIsOnline() ? failureCount < 1 : false;
      },

      // "offlineFirst" lets the query lifecycle proceed with no network
      // (drawing from the persisted cache) instead of pausing in
      // React Query's default "online" mode.
      networkMode: "offlineFirst",
    },
    mutations: {
      // Most mutations are not idempotent: do not auto-retry.
      retry: 0,

      // Same rationale as queries: let mutations enqueue offline instead
      // of immediately erroring out.
      networkMode: "offlineFirst",
    },
  },
});
