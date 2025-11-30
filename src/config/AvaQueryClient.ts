import { QueryClient } from "@tanstack/react-query";

export const AvaQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Minimize surprise refetching and heavy local work (with DuckDB)
      // Queries that can benefit from refetching should be explicitly set.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,

      // Only fetch on mount if the query is stale or not in the cache
      refetchOnMount: true,

      // Performance/cache
      staleTime: 6 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes

      // Avoids duplicate error toasts from retries in dev
      retry: 0,
    },
    mutations: {
      // Many mutations are not idempotent and so we should not automatically
      // retry them. Retries should be explicit.
      retry: 0,
    },
  },
});
